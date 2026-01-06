const { spawn } = require("child_process");

function formatTable(rows) {
  if (rows.length === 0) {
    return;
  }

  // Calculate column widths
  const columnWidths = rows[0].map((_, colIndex) => {
    return Math.max(...rows.map((row) => (row[colIndex] || "").length));
  });

  // Format each row
  const formattedRows = rows.map((row, rowIndex) => {
    const formatted = row.map((cell, colIndex) => {
      const cellStr = cell || "";
      return cellStr.padEnd(columnWidths[colIndex]);
    });
    return formatted.join("  ");
  });

  // Print header separator
  const separator = columnWidths.map((width) => "-".repeat(width)).join("  ");

  // Print table
  console.log(formattedRows[0]); // Header
  console.log(separator);
  formattedRows.slice(1).forEach((row) => console.log(row));
}

function listContainers() {
  // Only list containers defined in docker-compose.yml
  // They all start with "epicstory-" as per docker-compose.yml
  const containerNames = [
    "epicstory-app",
    "epicstory-api",
    "epicstory-postgres",
    "epicstory-pgadmin",
    "epicstory-peerjs",
    "epicstory-redis",
    // "epicstory-openbao", // uncomment if openbao is enabled
  ];

  // Show a concise table of running containers (status and ports)
  const args = [
    "ps",
    "--format",
    "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}",
  ];
  const dockerPs = spawn("docker", args, {
    stdio: ["ignore", "pipe", "inherit"],
  });

  let output = "";
  dockerPs.stdout.on("data", (data) => {
    output += data.toString();
  });

  dockerPs.on("close", (code) => {
    if (code !== 0) {
      console.error("Failed to list docker containers.");
      process.exit(1);
    }
    // Filter only containers that match our compose container names
    const lines = output.split("\n").filter((line) => line.trim());
    const rows = [["NAME", "IMAGE", "STATUS", "PORTS"]];

    for (const line of lines) {
      const [name, image, status, ports] = line.split("\t");
      if (containerNames.includes(name)) {
        rows.push([name, image || "", status || "", ports || ""]);
      }
    }

    formatTable(rows);
  });
}

listContainers();
