const { spawn } = require("child_process");
const { caddyComposeFile, dockerComposeFileArgs } = require("./compose-files");

// Only allow services defined in docker-compose.yml
const allowedServices = [
  "app",
  "api",
  "postgres",
  "pgadmin",
  "peerjs",
  "redis",
  "caddy",
  // "openbao", // uncomment if openbao is enabled
];

// Helper: validate service name
function validateServiceName(service) {
  if (!service || typeof service !== "string") {
    throw new Error(
      "No service name provided. Usage: node scripts/remove.js [service-name]",
    );
  }
  if (!allowedServices.includes(service)) {
    throw new Error(
      `Service "${service}" is not allowed or not defined in docker-compose.yml.\nAllowed: ${allowedServices.join(", ")}`,
    );
  }
  return service;
}

// Function to remove a specific service using docker compose stop and rm
function removeService(service) {
  return new Promise((resolve, reject) => {
    const composeFileArgs =
      service === "caddy"
        ? ["-f", caddyComposeFile]
        : dockerComposeFileArgs({ includeCaddy: false });

    // First stop the service
    const stopArgs = [
      "compose",
      ...composeFileArgs,
      "stop",
      "--timeout",
      "10",
      service,
    ];
    const stop = spawn("docker", stopArgs, { stdio: "inherit" });

    stop.on("close", (stopCode) => {
      if (stopCode !== 0 && stopCode !== null) {
        reject(
          new Error(
            `docker compose stop for service "${service}" failed with exit code ${stopCode}`,
          ),
        );
        return;
      }

      // Then remove the service container
      const rmArgs = ["compose", ...composeFileArgs, "rm", "-f", service];
      const rm = spawn("docker", rmArgs, { stdio: "inherit" });

      rm.on("close", (rmCode) => {
        if (rmCode === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `docker compose rm for service "${service}" failed with exit code ${rmCode}`,
            ),
          );
        }
      });

      rm.on("error", (err) => {
        reject(err);
      });
    });

    stop.on("error", (err) => {
      reject(err);
    });
  });
}

function runDockerComposeDown() {
  return new Promise((resolve, reject) => {
    const args = [
      "compose",
      ...dockerComposeFileArgs({ includeCaddy: true }),
      "down",
      "--remove-orphans",
    ];
    const down = spawn("docker", args, { stdio: "inherit" });

    down.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`docker-compose down failed with exit code ${code}`));
      }
    });

    down.on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  const serviceArg = process.argv[2];

  // If a service argument is provided, remove only that service
  // Skip if serviceArg is undefined or the string "undefined"
  if (serviceArg && serviceArg !== "undefined") {
    let validService;
    try {
      validService = validateServiceName(serviceArg);
    } catch (e) {
      console.error(`❌ ${e.message}`);
      process.exit(1);
    }

    try {
      await removeService(validService);
      console.log(`✅ Service "${validService}" has been stopped and removed.`);
    } catch (err) {
      console.error(
        `❌ Failed to remove service "${validService}":`,
        err.message,
      );
      process.exit(1);
    }
  } else {
    // If no argument is provided, remove all containers
    try {
      await runDockerComposeDown();
      console.log(
        "✅ All containers from docker-compose.yml have been stopped and removed.",
      );
    } catch (error) {
      console.error("❌ Failed to remove containers:", error.message);
      process.exit(1);
    }
  }
}

main();
