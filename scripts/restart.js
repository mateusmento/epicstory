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
      else reject(new Error(`docker ${args.join(" ")} failed with exit code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes("help") || argv.includes("--help") || argv.includes("-h")) {
    showHelp();
    return;
  }

  const build = hasFlag(argv, "--build");
  const logs = hasFlag(argv, "--logs");
  const args = argv.filter((a) => a !== "--build" && a !== "--logs");

  // First non-flag arg is service name (optional)
  const serviceArg = args[0];
  let service;
  try {
    service = validateServiceName(serviceArg);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  const composeFile = path.resolve(__dirname, "../docker-compose.yml");

  if (build) {
    // Recreate (and build) rather than "restart" so code/image changes are picked up.
    const upArgs = ["compose", "-f", composeFile, "up", "-d", "--build", "--force-recreate"];
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

