const { spawn } = require("child_process");
const {
  caddyComposeExists,
  caddyComposeFile,
  dockerComposeFileArgs,
} = require("./compose-files");

function runDockerComposeUp(service) {
  return new Promise((resolve, reject) => {
    const includeCaddy = !service || service === "caddy";
    const args = [
      "compose",
      ...(service === "caddy"
        ? ["-f", caddyComposeFile]
        : dockerComposeFileArgs({ includeCaddy })),
      "up",
      "-d",
    ];

    if (service && service !== "") {
      args.push(service);
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
  const service = process.argv[2]?.trim() || undefined;

  if (service === "caddy" && !caddyComposeExists()) {
    console.error("❌ docker-compose.caddy.yml not found");
    process.exit(1);
  }

  if (!service && caddyComposeExists()) {
    console.log(
      "Including Caddy (HTTPS reverse proxy). Requires ./certs from mkcert — see docs/dev-https.md",
    );
  }

  runDockerComposeUp(service).catch((err) => {
    console.error("❌ docker compose up failed:", err.message);
    process.exit(1);
  });
}

main();
