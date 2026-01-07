const { spawn } = require("child_process");

// Service names from docker-compose.yml
const allowedServices = [
  "app",
  "api",
  "postgres",
  "pgadmin",
  "peerjs",
  "redis",
  // "openbao", // uncomment if openbao is enabled
];

// Convert service name to container name, or return container name if already prefixed
function normalizeContainerName(input) {
  if (!input || typeof input !== "string") {
    throw new Error(
      "No service/container name provided. Usage: node scripts/logs.js [service-name]",
    );
  }

  // If it already starts with "epicstory-", treat as container name
  if (input.startsWith("epicstory-")) {
    const serviceName = input.replace("epicstory-", "");
    if (!allowedServices.includes(serviceName)) {
      throw new Error(
        `Service "${serviceName}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedServices.join(", ")}`,
      );
    }
    return input;
  }

  // Otherwise, treat as service name and prepend "epicstory-"
  if (!allowedServices.includes(input)) {
    throw new Error(
      `Service "${input}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedServices.join(", ")}`,
    );
  }
  return `epicstory-${input}`;
}

function logsContainer(container) {
  let containerName;
  try {
    containerName = normalizeContainerName(container);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  // Show Docker logs (follow)
  const logs = spawn("docker", ["logs", "-f", containerName], {
    stdio: "inherit",
  });

  logs.on("exit", (code) => process.exit(code));
}

function main() {
  const container = process.argv[2];
  logsContainer(container);
}

main();
