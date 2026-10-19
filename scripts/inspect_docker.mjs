import fs from "fs";

if (fs.existsSync("d:/ess-os/Dockerfile")) {
  console.log("=== Dockerfile ===");
  console.log(fs.readFileSync("d:/ess-os/Dockerfile", "utf8"));
}

if (fs.existsSync("d:/ess-os/next.config.mjs")) {
  console.log("=== next.config.mjs ===");
  console.log(fs.readFileSync("d:/ess-os/next.config.mjs", "utf8"));
} else if (fs.existsSync("d:/ess-os/next.config.js")) {
  console.log("=== next.config.js ===");
  console.log(fs.readFileSync("d:/ess-os/next.config.js", "utf8"));
}
