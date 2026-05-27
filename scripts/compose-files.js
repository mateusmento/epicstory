const fs = require("fs");
const path = require("path");

const composeFile = path.resolve(__dirname, "../docker-compose.yml");
const caddyComposeFile = path.resolve(__dirname, "../docker-compose.caddy.yml");

function caddyComposeExists() {
  return fs.existsSync(caddyComposeFile);
}

/** `-f` args for docker compose (optionally includes Caddy overlay). */
function dockerComposeFileArgs({ includeCaddy = false } = {}) {
  const args = ["-f", composeFile];
  if (includeCaddy && caddyComposeExists()) {
    args.push("-f", caddyComposeFile);
  }
  return args;
}

module.exports = {
  composeFile,
  caddyComposeFile,
  caddyComposeExists,
  dockerComposeFileArgs,
};
