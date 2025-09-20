const { spawn } = require("child_process");
const path = require("path");

// Input validation function
function validateInput(input, type) {
  if (typeof input !== "string") {
    throw new Error(`${type} must be a string`);
  }

  // Only allow alphanumeric, dots, dashes, underscores, and colons
  const validPattern = /^[a-zA-Z0-9._:-]+$/;
  if (!validPattern.test(input)) {
    throw new Error(`${type} contains invalid characters: ${input}`);
  }

  return input;
}

// Safe command execution
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function buildApi() {
  try {
    const config = require("../api/docker-build.json");

    // Validate inputs
    const name = validateInput(config.name, "name");
    const version = validateInput(config.version, "version");
    const nodeVersion = validateInput(config.node_version, "node_version");

    console.log("Building API Docker image...");

    // Correct spawn usage with array format
    await runCommand(
      "docker",
      [
        "build",
        "-t",
        `${name}:${version}`,
        "--build-arg",
        `NODE_IMAGE_VERSION=${nodeVersion}-bullseye-slim`,
        ".",
      ],
      {
        cwd: path.resolve(__dirname, "../api"),
      },
    );

    console.log("Loading image into minikube...");
    await runCommand("minikube", ["image", "load", `${name}:${version}`]);

    console.log("API build completed successfully!");
  } catch (error) {
    console.error("API build failed:", error.message);
    process.exit(1);
  }
}

async function buildApp() {
  try {
    const config = require("../app/docker-build.json");

    // Validate inputs
    const name = validateInput(config.name, "name");
    const version = validateInput(config.version, "version");
    const nodeVersion = validateInput(config.node_version, "node_version");
    const nginxVersion = validateInput(config.nginx_version, "nginx_version");

    console.log("Building App Docker image...");

    // Correct spawn usage with array format
    await runCommand(
      "docker",
      [
        "build",
        "-t",
        `${name}:${version}`,
        "--build-arg",
        `NODE_IMAGE_VERSION=${nodeVersion}`,
        "--build-arg",
        `NGINX_IMAGE_VERSION=${nginxVersion}`,
        ".",
      ],
      {
        cwd: path.resolve(__dirname, "../app"),
      },
    );

    console.log("Loading image into minikube...");
    await runCommand("minikube", ["image", "load", `${name}:${version}`]);

    console.log("App build completed successfully!");
  } catch (error) {
    console.error("App build failed:", error.message);
    process.exit(1);
  }
}

// Main execution
if (process.argv[2] === "api") {
  buildApi();
} else if (process.argv[2] === "app") {
  buildApp();
} else {
  console.error("Usage: node build.js [api|app]");
  process.exit(1);
}
