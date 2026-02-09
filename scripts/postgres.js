const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const BACKUP_PREFIX = "postgres.backup.";
const BACKUP_META_FILE = ".epic-postgres-backup.json";
// Keep "current state" metadata OUTSIDE the Postgres data directory to avoid polluting PGDATA.
// We'll store these under a sibling directory: <parent-of-dataDir>/.epic-postgres/
const CURRENT_STATE_FILE = "state.json";
const CURRENT_LAST_ROTATED_FILE = "last-rotated.txt";
const CURRENT_RESTORED_FROM_FILE = "restored-from.txt";

function metaDirForDataDir(dataDir) {
  return path.join(path.dirname(dataDir), ".epic-postgres");
}

async function ensureMetaDir(dataDir) {
  const metaDir = metaDirForDataDir(dataDir);
  await ensureDir(metaDir);
  return metaDir;
}

async function readCurrentState(dataDir) {
  const metaDir = metaDirForDataDir(dataDir);
  const state = await readJsonIfExists(path.join(metaDir, CURRENT_STATE_FILE));
  if (state) return state;

  // Back-compat: older versions stored state inside the data directory
  return await readJsonIfExists(
    path.join(dataDir, ".epic-postgres-state.json"),
  );
}

async function writeCurrentState(dataDir, obj) {
  const metaDir = await ensureMetaDir(dataDir);
  await writeJson(path.join(metaDir, CURRENT_STATE_FILE), obj);
}

async function writeLastRotated(dataDir, content) {
  const metaDir = await ensureMetaDir(dataDir);
  await fsp.writeFile(
    path.join(metaDir, CURRENT_LAST_ROTATED_FILE),
    content,
    "utf8",
  );
}

async function writeRestoredFrom(dataDir, content) {
  const metaDir = await ensureMetaDir(dataDir);
  await fsp.writeFile(
    path.join(metaDir, CURRENT_RESTORED_FROM_FILE),
    content,
    "utf8",
  );
}

function formatUtcForPath(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    String(d.getUTCFullYear()) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function humanBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : n < 10 ? 2 : n < 100 ? 1 : 0;
  return `${n.toFixed(digits)} ${units[i]}`;
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function readJsonIfExists(p) {
  try {
    const raw = await fsp.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function writeJson(p, obj) {
  await fsp.writeFile(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`${command} ${args.join(" ")} failed: ${err}`));
    });
    child.on("error", reject);
  });
}

async function dirSizeBytes(dirPath) {
  // Fast path on Linux/macOS if `du` exists.
  try {
    const { stdout } = await runCapture("du", ["-sb", dirPath]);
    const first = stdout.trim().split(/\s+/)[0];
    const n = Number(first);
    if (Number.isFinite(n)) return n;
  } catch {
    // ignore, fallback below
  }

  // Fallback: recursive walk (slower).
  let total = 0;
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dirPath, ent.name);
    if (ent.isDirectory()) total += await dirSizeBytes(p);
    else if (ent.isFile()) total += (await fsp.stat(p)).size;
  }
  return total;
}

async function copyDir(src, dst) {
  // Prefer system `cp -a` to better preserve permissions/ownership (important for docker-owned PG data).
  // Fallback to Node's fs.cp if `cp` isn't available.
  try {
    await runCapture("cp", ["-a", src, dst]);
    return;
  } catch {
    // ignore and fallback
  }

  // Node >=16 supports fs.cp
  await fsp.cp(src, dst, { recursive: true, errorOnExist: true });
}

async function getBackupInfo(backupDir) {
  const metaPath = path.join(backupDir, BACKUP_META_FILE);
  const meta = await readJsonIfExists(metaPath);
  const name = path.basename(backupDir);
  const fallbackDatetime = name.startsWith(BACKUP_PREFIX)
    ? name.slice(BACKUP_PREFIX.length)
    : undefined;
  const datetime = meta?.backupDatetime ?? fallbackDatetime ?? name;
  const createdAtISO = meta?.createdAtISO;
  return { name, datetime, createdAtISO, backupDir };
}

async function listBackups(backupsDir) {
  const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(BACKUP_PREFIX))
    .map((e) => path.join(backupsDir, e.name));

  const infos = [];
  for (const d of dirs) infos.push(await getBackupInfo(d));

  // Sort descending by datetime (path-safe UTC format sorts lexicographically)
  infos.sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));
  return infos;
}

async function createBackup({ dataDir, backupsDir, reason }) {
  const dt = formatUtcForPath(new Date());
  const iso = new Date().toISOString();
  const backupName = `${BACKUP_PREFIX}${dt}`;
  const backupDir = path.join(backupsDir, backupName);

  if (!(await pathExists(dataDir))) {
    throw new Error(`Data dir not found: ${dataDir}`);
  }

  if (await pathExists(backupDir)) {
    throw new Error(`Backup already exists: ${backupDir}`);
  }

  await ensureDir(backupsDir);
  await copyDir(dataDir, backupDir);

  await writeJson(path.join(backupDir, BACKUP_META_FILE), {
    backupDatetime: dt,
    createdAtISO: iso,
    sourceDataDir: dataDir,
    reason: reason ?? "manual-rotate",
  });

  // Marker to check later (stored alongside data dir, not inside it)
  await writeLastRotated(dataDir, `${dt}\n${iso}\n`);

  await writeCurrentState(dataDir, {
    backedUpAt: dt,
    backedUpAtISO: iso,
    backupDirName: backupName,
  });

  return { dt, backupDir, backupName };
}

async function ensureCurrentBackedUp({ dataDir, backupsDir }) {
  const state = await readCurrentState(dataDir);
  const backedUpAt = state?.backedUpAt;
  const backupDirName = state?.backupDirName;
  if (backedUpAt && backupDirName) {
    const maybe = path.join(backupsDir, backupDirName);
    if (await pathExists(maybe)) return { skipped: true, backupDir: maybe };
  }
  const created = await createBackup({
    dataDir,
    backupsDir,
    reason: "auto-backup-before-restore",
  });
  return { skipped: false, backupDir: created.backupDir };
}

async function resolveBackupDir({ backupsDir, target }) {
  // Target may be:
  // - full directory name (postgres.backup.<dt>)
  // - <dt> (YYYYMMDDTHHMMSSZ)
  // - prefix of dt
  const direct = path.join(backupsDir, target);
  if (await pathExists(direct)) return direct;

  const byDt = path.join(backupsDir, `${BACKUP_PREFIX}${target}`);
  if (await pathExists(byDt)) return byDt;

  const backups = await listBackups(backupsDir);
  const match = backups.find(
    (b) => String(b.datetime).startsWith(String(target)) || b.name === target,
  );
  if (!match) {
    throw new Error(
      `Backup not found for target "${target}". Run: epic postgres list`,
    );
  }
  return match.backupDir;
}

async function restoreBackup({ dataDir, backupsDir, target }) {
  const backupDir = await resolveBackupDir({ backupsDir, target });
  const info = await getBackupInfo(backupDir);

  await ensureCurrentBackedUp({ dataDir, backupsDir });

  // Replace current data with backup
  await fsp.rm(dataDir, { recursive: true, force: true });
  await copyDir(backupDir, dataDir);

  // Cleanup backup-only meta file copied into current dir (keep current markers separate)
  try {
    await fsp.rm(path.join(dataDir, BACKUP_META_FILE), { force: true });
  } catch {
    // ignore
  }

  const restoredAtISO = new Date().toISOString();
  await writeRestoredFrom(dataDir, `${info.datetime}\n${restoredAtISO}\n`);

  await writeCurrentState(dataDir, {
    // Mark "current data" as already backed up by the backup we restored from
    // so future restores won't re-backup unnecessarily.
    backedUpAt: info.datetime,
    backupDirName: info.name,
    restoredFrom: info.datetime,
    restoredAtISO,
    restoredFromDir: info.name,
  });

  return info;
}

function showHelp() {
  console.log(`
Postgres data rotation commands

Usage:
  epic postgres rotate
  epic postgres list
  epic postgres restore <datetime|name|prefix>
  epic postgres restore-latest

Options:
  --data-dir <path>     Default: ./data/postgres (repo-relative)
  --backups-dir <path>  Default: ./data (repo-relative)

Notes:
  - rotate creates ./data/${BACKUP_PREFIX}<UTC_DATETIME> by copying the data dir
  - restore auto-rotates current data first unless it was already rotated
  - restore writes restored-from metadata under ./data/.epic-postgres/
`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const defaultDataDir = path.resolve(repoRoot, "data", "postgres");
  const defaultBackupsDir = path.resolve(repoRoot, "data");

  const args = process.argv.slice(2);
  const command = args[0];

  // Parse options placed anywhere after command:
  //   epic postgres restore --data-dir ./data/postgres 2026...
  const rest = args.slice(1);
  let dataDirOpt;
  let backupsDirOpt;
  const positionals = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--data-dir") {
      dataDirOpt = rest[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("--data-dir=")) {
      dataDirOpt = a.slice("--data-dir=".length);
      continue;
    }
    if (a === "--backups-dir") {
      backupsDirOpt = rest[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("--backups-dir=")) {
      backupsDirOpt = a.slice("--backups-dir=".length);
      continue;
    }
    if (a.startsWith("-")) {
      // unknown flag (ignore, but keep behavior predictable)
      continue;
    }
    positionals.push(a);
  }

  const dataDir = path.resolve(repoRoot, dataDirOpt ?? defaultDataDir);
  const backupsDir = path.resolve(repoRoot, backupsDirOpt ?? defaultBackupsDir);

  try {
    if (!command || ["help", "--help", "-h"].includes(command)) {
      showHelp();
      process.exit(0);
    }

    if (command === "rotate") {
      const { dt, backupDir } = await createBackup({ dataDir, backupsDir });
      console.log(`✅ Rotated postgres data`);
      console.log(`- data:    ${dataDir}`);
      console.log(`- backup:  ${backupDir}`);
      console.log(`- datetime:${dt}`);
      return;
    }

    if (command === "list") {
      const backups = await listBackups(backupsDir);
      if (backups.length === 0) {
        console.log("No backups found.");
        return;
      }

      const rows = [["DATETIME", "SIZE", "NAME"]];
      for (const b of backups) {
        const size = await dirSizeBytes(b.backupDir);
        rows.push([String(b.datetime), humanBytes(size), b.name]);
      }

      // basic table format
      const widths = rows[0].map((_, i) =>
        Math.max(...rows.map((r) => (r[i] || "").length)),
      );
      const sep = widths.map((w) => "-".repeat(w)).join("  ");
      const fmt = (r) =>
        r.map((c, i) => (c || "").padEnd(widths[i])).join("  ");
      console.log(fmt(rows[0]));
      console.log(sep);
      rows.slice(1).forEach((r) => console.log(fmt(r)));
      return;
    }

    if (command === "restore") {
      const target = positionals[0];
      if (!target) {
        throw new Error(
          "Missing restore target. Usage: epic postgres restore <datetime|name|prefix>",
        );
      }
      if (target === "latest") {
        const backups = await listBackups(backupsDir);
        if (backups.length === 0)
          throw new Error("No backups found to restore.");
        const latest = backups[0];
        const info = await restoreBackup({
          dataDir,
          backupsDir,
          target: latest.name,
        });
        console.log(`✅ Restored latest postgres backup`);
        console.log(`- data:     ${dataDir}`);
        console.log(`- restored: ${info.name}`);
        console.log(`- datetime: ${info.datetime}`);
        return;
      }
      const info = await restoreBackup({ dataDir, backupsDir, target });
      console.log(`✅ Restored postgres data`);
      console.log(`- data:     ${dataDir}`);
      console.log(`- restored: ${info.name}`);
      console.log(`- datetime: ${info.datetime}`);
      return;
    }

    if (command === "restore-latest") {
      const backups = await listBackups(backupsDir);
      if (backups.length === 0) throw new Error("No backups found to restore.");
      const latest = backups[0];
      const info = await restoreBackup({
        dataDir,
        backupsDir,
        target: latest.name,
      });
      console.log(`✅ Restored latest postgres backup`);
      console.log(`- data:     ${dataDir}`);
      console.log(`- restored: ${info.name}`);
      console.log(`- datetime: ${info.datetime}`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (
      msg.includes("EACCES") ||
      msg.toLowerCase().includes("permission denied")
    ) {
      console.error(
        `❌ Postgres command failed (permissions): ${msg}\n` +
          `\n` +
          `Your postgres data folder is likely owned by root/docker. Try running with sudo, e.g.:\n` +
          `  sudo epic postgres rotate\n` +
          `  sudo epic postgres list\n` +
          `  sudo epic postgres restore-latest\n`,
      );
      process.exit(1);
    }
    console.error(`❌ Postgres command failed: ${msg}`);
    process.exit(1);
  }
}

main();
