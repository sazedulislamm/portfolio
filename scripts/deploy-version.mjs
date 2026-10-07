import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const wranglerPath = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerPath, ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

const versions = JSON.parse(runWrangler(["versions", "list", "--json"]));
const latestVersion = versions.reduce((latest, version) =>
  !latest || version.number > latest.number ? version : latest,
);

if (!latestVersion?.id) {
  throw new Error("No uploaded Worker version was found.");
}

console.log(`Deploying Worker version ${latestVersion.id} at 100% traffic.`);
runWrangler([
  "versions",
  "deploy",
  "--version-id",
  latestVersion.id,
  "--percentage",
  "100",
]);
