import { execSync } from "child_process";

function check(name, dir) {
  console.log("=== " + name + " (" + dir + ") ===");
  try {
    console.log("Remote:", execSync("git remote -v", { cwd: dir }).toString().trim());
    console.log("Status:\n" + (execSync("git status -s", { cwd: dir }).toString().trim() || "Clean"));
    console.log("Last commit:\n" + execSync("git log -1 --oneline", { cwd: dir }).toString().trim());
  } catch (e) {
    console.log("Error:", e.message);
  }
  console.log("\n");
}

check("ess-os", "d:/ess-os");
check("crmbot", "d:/crmbot");
check("mdz-crm", "c:/Users/Aviral Shukla/OneDrive/Desktop/mdz-crm");
