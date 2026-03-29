const { spawn } = require("child_process");
const path = require("path");

// Only allow services defined in docker-compose.yml
const allowedServices = [
  "app",
  "api",
  "postgres",
  "pgadmin",
  "peerjs",
  "redis",
  // "openbao", // uncomment if openbao is enabled
];

function showHelp() {
  console.log(`
🔁 Restart containers (docker compose)

Usage:
  epic restart                   Restart all services (no rebuild)
  epic restart <service>         Restart a single service (no rebuild)
  epic restart --recreate        Recreate all services (force-recreate; refresh env)
  epic restart <service> --recreate Recreate one service (force-recreate; refresh env)
  epic restart --build           Recreate all services (build + force-recreate)
  epic restart <service> --build Recreate one service (build + force-recreate)
  epic restart --logs            Follow logs after restart (all services)
  epic restart <service> --logs  Follow logs after restart (one service)

Allowed services:
  ${allowedServices.join(", ")}
`);
}

function validateServiceName(service) {
  if (!service || typeof service !== "string") return undefined;
  if (!allowedServices.includes(service)) {
    throw new Error(
      `Service "${service}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedServices.join(", ")}`,
    );
  }
  return service;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function runDocker(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`docker ${args.join(" ")} failed with exit code ${code}`),
        );
    });
    child.on("error", reject);
  });
}

function parseArgs(argv) {
  const knownFlags = new Set(["--build", "--recreate", "--logs"]);
  const flags = new Set();
  let service;
  const extras = [];

  for (const token of argv) {
    if (token === "help" || token === "--help" || token === "-h") {
      return { help: true };
    }
    if (knownFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (token.startsWith("-")) {
      // Unknown flag
      extras.push(token);
      continue;
    }
    if (!service) service = token;
    else extras.push(token);
  }

  return {
    help: false,
    flags,
    service,
    extras,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);

  if (parsed.help) {
    showHelp();
    return;
  }

  if (parsed.extras.length > 0) {
    console.error(
      `❌ Unknown extra args/flags: ${parsed.extras.join(" ")}\n\nRun: epic restart --help`,
    );
    process.exit(1);
  }

  const build = parsed.flags.has("--build");
  const recreate = parsed.flags.has("--recreate");
  const logs = parsed.flags.has("--logs");

  if (build && recreate) {
    console.error("❌ Use only one: --build or --recreate");
    process.exit(1);
  }

  // First non-flag arg is service name (optional)
  const serviceArg = parsed.service;
  let service;
  try {
    service = validateServiceName(serviceArg);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  const composeFile = path.resolve(__dirname, "../docker-compose.yml");

  if (build || recreate) {
    // Recreate rather than "restart" so compose changes (.env, env_file, environment) are picked up.
    const upArgs = [
      "compose",
      "-f",
      composeFile,
      "up",
      "-d",
      "--force-recreate",
    ];
    if (build) upArgs.push("--build");
    // If scoped to a single service, avoid touching dependencies.
    if (service) upArgs.push("--no-deps");
    if (service) upArgs.push(service);
    await runDocker(upArgs);
  } else {
    const restartArgs = ["compose", "-f", composeFile, "restart"];
    if (service) restartArgs.push(service);
    await runDocker(restartArgs);
  }

  if (logs) {
    // Follow compose logs (service-scoped if provided).
    const logsArgs = ["compose", "-f", composeFile, "logs", "-f"];
    if (service) logsArgs.push(service);
    await runDocker(logsArgs);
  }
}

main().catch((err) => {
  console.error("❌ Restart failed:", err.message);
  process.exit(1);
});
