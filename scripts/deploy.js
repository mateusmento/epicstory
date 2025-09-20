const { spawn } = require("child_process");
const path = require("path");

if (process.argv[2] === "apply") {
  spawn(`kubectl`, ["apply", "-f", "."], {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../deploy/kubernetes"),
  });
}

if (process.argv[2] === "delete") {
  spawn(`kubectl`, ["delete", "-f", "."], {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../deploy/kubernetes"),
  });
}
