const { spawn } = require("child_process");

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

function validateContainerName(container) {
  if (!container || typeof container !== "string") {
    throw new Error(
      "No container name provided. Usage: node scripts/inject.js [container-name]",
    );
  }
  if (!allowedContainers.includes(container)) {
    throw new Error(
      `Container "${container}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedContainers.join(", ")}`,
    );
  }
  return container;
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
    const validContainer = validateContainerName(container);
    inject(validContainer);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

main();
