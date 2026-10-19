import fs from "fs";

if (fs.existsSync("d:/ess-os/.dockerignore")) {
  console.log("=== .dockerignore ===");
  console.log(fs.readFileSync("d:/ess-os/.dockerignore", "utf8"));
} else {
  console.log("No .dockerignore found!");
}
