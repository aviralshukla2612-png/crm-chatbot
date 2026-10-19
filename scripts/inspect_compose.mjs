import fs from "fs";

if (fs.existsSync("d:/ess-os/docker-compose.yml")) {
  console.log("=== docker-compose.yml ===");
  console.log(fs.readFileSync("d:/ess-os/docker-compose.yml", "utf8"));
}
