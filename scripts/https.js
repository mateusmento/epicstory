#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code})`));
    });
    p.on("error", reject);
  });
}

function runCapture(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    p.stdout.on("data", (d) => (out += d.toString("utf8")));
    p.stderr.on("data", (d) => (err += d.toString("utf8")));
    p.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else
        reject(
          new Error(`${cmd} ${args.join(" ")} failed (${code}): ${err.trim()}`),
        );
    });
    p.on("error", reject);
  });
}

function usage() {
  console.log(`
epic https

Usage:
  epic https gen-certs [--domain epicstory.io]
  epic https install-ca --remote user@host [--nss auto|always|never] [--name "mkcert epicstory (host)"] [--no-tty]
  epic https install-ca-local [--nss auto|always|never] [--name "mkcert epicstory (host)"]

Notes:
  - Requires mkcert installed on the host machine.
  - install-ca will:
    - scp mkcert rootCA.pem to remote (~)
    - install into system trust store (update-ca-certificates) if missing/different
    - optionally import into browser NSS DB:
      - auto: only for snap Chromium (recommended)

Tips:
  - You can pass \`--nss\` without a value to mean \`--nss always\`.
`);
}

function takeFlagValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return { value: undefined, rest: args };
  const next = args[idx + 1];
  if (!next || next.startsWith("-"))
    return { value: undefined, rest: args.filter((_, i) => i !== idx) };
  const rest = args.filter((_, i) => i !== idx && i !== idx + 1);
  return { value: next, rest };
}

function takeFlagValueWithDefault(args, flag, def) {
  const r = takeFlagValue(args, flag);
  return { value: r.value ?? def, rest: r.rest };
}

function takeFlagEnum(args, flag, { def, bareValue }) {
  // Treat `--flag` with no value as `bareValue` (useful for boolean-ish enums like --nss).
  const idx = args.indexOf(flag);
  if (idx === -1) return { value: def, rest: args };
  const next = args[idx + 1];
  if (!next || next.startsWith("-")) {
    return { value: bareValue, rest: args.filter((_, i) => i !== idx) };
  }
  const rest = args.filter((_, i) => i !== idx && i !== idx + 1);
  return { value: next, rest };
}

async function ensureMkcert() {
  try {
    await runCapture("mkcert", ["-version"]);
  } catch {
    console.error(
      "❌ mkcert not found. Install it first (see docs/dev-https.md).",
    );
    process.exit(1);
  }
}

async function genCerts(args) {
  await ensureMkcert();
  const dom = takeFlagValueWithDefault(args, "--domain", "epicstory.io");
  const domain = dom.value;

  const repoRoot = path.resolve(__dirname, "..");
  const certDir = path.join(repoRoot, "certs");
  const certPath = path.join(certDir, `${domain}.pem`);
  const keyPath = path.join(certDir, `${domain}-key.pem`);

  await run("mkdir", ["-p", certDir]);
  console.log(`🔐 Generating certs for ${domain}`);
  await run("mkcert", ["-cert-file", certPath, "-key-file", keyPath, domain], {
    cwd: repoRoot,
  });
  console.log(`✅ Wrote:\n- ${certPath}\n- ${keyPath}`);
  console.log(`ℹ️  mkcert CAROOT: ${await runCapture("mkcert", ["-CAROOT"])}`);
}

async function installCa(args) {
  await ensureMkcert();

  const r1 = takeFlagValue(args, "--remote");
  const remote = r1.value;
  if (!remote) {
    console.error("❌ Missing --remote (example: --remote mateus@192.168.0.6)");
    process.exit(1);
  }

  const r2 = takeFlagEnum(r1.rest, "--nss", {
    def: "auto",
    bareValue: "always",
  });
  const nssMode = r2.value;
  const r3 = takeFlagValueWithDefault(
    r2.rest,
    "--name",
    "mkcert epicstory (host)",
  );
  const nickname = r3.value;

  // sudo prompts on the remote need a TTY; allow opting out with --no-tty.
  const noTty = r3.rest.includes("--no-tty");

  const caroot = await runCapture("mkcert", ["-CAROOT"]);
  const rootPem = path.join(caroot, "rootCA.pem");

  // Copy rootCA.pem to remote home directory
  console.log(`📤 Copying root CA to ${remote}:~/rootCA.pem`);
  await run("scp", [rootPem, `${remote}:~/rootCA.pem`]);

  // Remote install into system trust store only if needed (sha mismatch)
  // Also optionally import into NSS if needed.
  const remoteScript = `
set -euo pipefail

ROOT_SRC="$HOME/rootCA.pem"
SYSTEM_DST="/usr/local/share/ca-certificates/epicstory-mkcert-rootCA.crt"

need_system_install=1
if [ -f "$SYSTEM_DST" ]; then
  if sha256sum "$ROOT_SRC" "$SYSTEM_DST" | awk '{print $1}' | uniq | wc -l | grep -q '^1$'; then
    need_system_install=0
  fi
fi

if [ "$need_system_install" -eq 1 ]; then
  echo "🔧 Installing CA into system trust store: $SYSTEM_DST"
  sudo cp "$ROOT_SRC" "$SYSTEM_DST"
  sudo update-ca-certificates
else
  echo "✅ System CA already installed (same SHA256), skipping update-ca-certificates"
fi

NSS_MODE="${nssMode}"
NICKNAME="${nickname}"

detect_snap_chromium=0
if command -v snap >/dev/null 2>&1; then
  if snap list 2>/dev/null | awk '{print $1}' | grep -qx chromium; then
    detect_snap_chromium=1
  fi
fi

should_nss=0
case "$NSS_MODE" in
  always) should_nss=1 ;;
  never) should_nss=0 ;;
  auto)
    if [ "$detect_snap_chromium" -eq 1 ]; then should_nss=1; else should_nss=0; fi
    ;;
  *)
    echo "❌ Invalid --nss mode: $NSS_MODE (use auto|always|never)" >&2
    exit 2
    ;;
esac

if [ "$should_nss" -eq 0 ]; then
  echo "ℹ️  NSS import skipped (mode=$NSS_MODE, snapChromium=$detect_snap_chromium)"
  exit 0
fi

echo "🔧 NSS import enabled (mode=$NSS_MODE, snapChromium=$detect_snap_chromium)"

if ! command -v certutil >/dev/null 2>&1; then
  echo "📦 Installing libnss3-tools (certutil)"
  sudo apt update
  sudo apt install -y libnss3-tools
fi

if [ "$detect_snap_chromium" -eq 1 ]; then
  NSSDB="$HOME/snap/chromium/current/.pki/nssdb"
else
  NSSDB="$HOME/.pki/nssdb"
fi

mkdir -p "$NSSDB"

if certutil -d "sql:$NSSDB" -L 2>/dev/null | awk '{print $1}' | grep -Fxq "$NICKNAME"; then
  echo "✅ NSS already contains '$NICKNAME' (sql:$NSSDB), skipping"
  exit 0
fi

echo "🔐 Importing CA into NSS DB (sql:$NSSDB) as '$NICKNAME'"
certutil -d "sql:$NSSDB" -A -t "C,," -n "$NICKNAME" -i "$SYSTEM_DST"
echo "✅ NSS import done"
`;

  console.log(`🚀 Installing CA on remote (system store + optional NSS)…`);
  const sshArgs = [
    ...(noTty ? [] : ["-t"]),
    remote,
    "bash",
    "-lc",
    remoteScript,
  ];
  await run("ssh", sshArgs);
  console.log("✅ Done. Restart the browser on the client machine.");
}

async function installCaLocal(args) {
  await ensureMkcert();

  const r2 = takeFlagEnum(args, "--nss", { def: "auto", bareValue: "always" });
  const nssMode = r2.value;
  const r3 = takeFlagValueWithDefault(
    r2.rest,
    "--name",
    "mkcert epicstory (host)",
  );
  const nickname = r3.value;

  const caroot = await runCapture("mkcert", ["-CAROOT"]);
  const rootPem = path.join(caroot, "rootCA.pem");

  // Reuse the same logic as the remote script, but run locally.
  // Use sudo where required (copy CA + update-ca-certificates + optional apt install).
  const localScript = `
set -euo pipefail

ROOT_SRC="${rootPem}"
SYSTEM_DST="/usr/local/share/ca-certificates/epicstory-mkcert-rootCA.crt"

need_system_install=1
if [ -f "$SYSTEM_DST" ]; then
  if sha256sum "$ROOT_SRC" "$SYSTEM_DST" | awk '{print $1}' | uniq | wc -l | grep -q '^1$'; then
    need_system_install=0
  fi
fi

if [ "$need_system_install" -eq 1 ]; then
  echo "🔧 Installing CA into system trust store: $SYSTEM_DST"
  sudo cp "$ROOT_SRC" "$SYSTEM_DST"
  sudo update-ca-certificates
else
  echo "✅ System CA already installed (same SHA256), skipping update-ca-certificates"
fi

NSS_MODE="${nssMode}"
NICKNAME="${nickname}"

detect_snap_chromium=0
if command -v snap >/dev/null 2>&1; then
  if snap list 2>/dev/null | awk '{print $1}' | grep -qx chromium; then
    detect_snap_chromium=1
  fi
fi

should_nss=0
case "$NSS_MODE" in
  always) should_nss=1 ;;
  never) should_nss=0 ;;
  auto)
    if [ "$detect_snap_chromium" -eq 1 ]; then should_nss=1; else should_nss=0; fi
    ;;
  *)
    echo "❌ Invalid --nss mode: $NSS_MODE (use auto|always|never)" >&2
    exit 2
    ;;
esac

if [ "$should_nss" -eq 0 ]; then
  echo "ℹ️  NSS import skipped (mode=$NSS_MODE, snapChromium=$detect_snap_chromium)"
  exit 0
fi

echo "🔧 NSS import enabled (mode=$NSS_MODE, snapChromium=$detect_snap_chromium)"

if ! command -v certutil >/dev/null 2>&1; then
  echo "📦 Installing libnss3-tools (certutil)"
  sudo apt update
  sudo apt install -y libnss3-tools
fi

if [ "$detect_snap_chromium" -eq 1 ]; then
  NSSDB="$HOME/snap/chromium/current/.pki/nssdb"
else
  NSSDB="$HOME/.pki/nssdb"
fi

mkdir -p "$NSSDB"

if certutil -d "sql:$NSSDB" -L 2>/dev/null | awk '{print $1}' | grep -Fxq "$NICKNAME"; then
  echo "✅ NSS already contains '$NICKNAME' (sql:$NSSDB), skipping"
  exit 0
fi

echo "🔐 Importing CA into NSS DB (sql:$NSSDB) as '$NICKNAME'"
certutil -d "sql:$NSSDB" -A -t "C,," -n "$NICKNAME" -i "$SYSTEM_DST"
echo "✅ NSS import done"
`;

  console.log("🚀 Installing CA locally (system store + optional NSS)…");
  await run("bash", ["-lc", localScript]);
  console.log("✅ Done. Restart the browser on this machine.");
}

async function main() {
  const args = process.argv.slice(2);
  const [cmd, ...rest] = args;

  if (!cmd || ["help", "--help", "-h"].includes(cmd)) {
    usage();
    return;
  }

  try {
    if (cmd === "gen-certs") return await genCerts(rest);
    if (cmd === "install-ca") return await installCa(rest);
    if (cmd === "install-ca-local") return await installCaLocal(rest);
    console.error("❌ Unknown epic https subcommand:", cmd);
    usage();
    process.exit(1);
  } catch (e) {
    console.error("❌ https command failed:", e.message || e);
    process.exit(1);
  }
}

main();
