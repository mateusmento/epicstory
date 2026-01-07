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
      "No service/container name provided. Usage: node scripts/inject.js [service-name]",
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

function inject(container) {
  // Attach an interactive shell session into the running container
  console.log(`🔗 Injecting into container: ${container}`);
  const shell = spawn("docker", ["exec", "-it", container, "bash"], {
    stdio: "inherit",
  });

  shell.on("exit", (code) => process.exit(code));
}

function main() {
  const container = process.argv[2];
  try {
    const validContainer = normalizeContainerName(container);
    inject(validContainer);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

main();
