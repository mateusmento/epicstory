const { spawn } = require("child_process");

function logsContainer(container) {
  if (!container || typeof container !== "string") {
    console.error(
      "No container name provided. Usage: node scripts/logs.js [container-name]",
    );
    process.exit(1);
  }

  // Only allow containers defined in docker-compose.yml
  const allowedContainers = [
    "epicstory-app",
    "epicstory-api",
    "epicstory-postgres",
    "epicstory-pgadmin",
    "epicstory-peerjs",
    "epicstory-redis",
    // "epicstory-openbao", // uncomment if openbao is enabled
  ];

  if (!allowedContainers.includes(container)) {
    console.error(
      `Container "${container}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedContainers.join(", ")}`,
    );
    process.exit(1);
  }

  // Show Docker logs (follow)
  const logs = spawn("docker", ["logs", "-f", container], {
    stdio: "inherit",
  });

  logs.on("exit", (code) => process.exit(code));
}

function main() {
  const container = process.argv[2];
  logsContainer(container);
}

main();
