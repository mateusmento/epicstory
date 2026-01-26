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

function inject(container, preferredShell) {
  // Attach an interactive shell session into the running container.
  // Not all images ship with bash (e.g. peerjs/peerjs-server), so we fall back to sh.
  const shellsToTry = preferredShell ? [preferredShell] : ["bash", "sh"];
  const ttyFlags = process.stdin.isTTY ? ["-it"] : ["-i"];

  const tryNext = (idx) => {
    const shellName = shellsToTry[idx];
    if (!shellName) {
      console.error(
        `❌ Inject failed: no compatible shell found. Tried: ${shellsToTry.join(
          ", ",
        )}`,
      );
      process.exit(127);
    }

    console.log(`🔗 Injecting into container: ${container} (${shellName})`);
    const child = spawn("docker", ["exec", ...ttyFlags, container, shellName], {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      // 127 is commonly "command not found" (e.g., bash missing). Try fallback.
      if (!preferredShell && code === 127 && idx + 1 < shellsToTry.length) {
        return tryNext(idx + 1);
      }
      process.exit(code ?? 1);
    });
  };

  tryNext(0);
}

function main() {
  const container = process.argv[2];
  const preferredShell = process.argv[3]; // optional: node scripts/inject.js peerjs sh
  try {
    const validContainer = normalizeContainerName(container);
    inject(validContainer, preferredShell);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

main();
