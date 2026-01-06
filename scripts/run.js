const { spawn } = require("child_process");
const path = require("path");

function runDockerComposeUp(container) {
  return new Promise((resolve, reject) => {
    // Compose file location
    const composeFile = path.resolve(__dirname, "../docker-compose.yml");
    // Use -f to reference explicit file
    const args = ["compose", "-f", composeFile, "up", "-d"];
    if (container) {
      args.push(container);
    }
    const up = spawn("docker", args, { stdio: "inherit" });

    up.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`docker compose up failed with exit code ${code}`));
      }
    });

    up.on("error", (err) => {
      reject(err);
    });
  });
}

function main() {
  const container = process.argv[2];
  runDockerComposeUp(container);
}

main();
