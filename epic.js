#!/usr/bin/env node

// Keep `package.json`'s `bin: { "epic": "./epic.js" }` working.
// The actual CLI implementation lives in `./epic`.
require("./epic");

