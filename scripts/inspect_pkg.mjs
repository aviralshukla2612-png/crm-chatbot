import fs from "fs";

if (fs.existsSync("d:/ess-os/package.json")) {
  const pkg = JSON.parse(fs.readFileSync("d:/ess-os/package.json", "utf8"));
  console.log("Scripts:", pkg.scripts);
  console.log("Dependencies count:", Object.keys(pkg.dependencies || {}).length);
}
