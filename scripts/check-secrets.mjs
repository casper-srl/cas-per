import fs from "node:fs";
import { spawnSync } from "node:child_process";

const patterns = [
  /https:\/\/[^\s"']+\/api\/webhooks\/[a-f0-9-]{30,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-proj-[A-Za-z0-9_-]{20,}/,
  /EAA[A-Za-z0-9]{40,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /GOCSPX-[A-Za-z0-9_-]{20,}/,
  /0\.[a-f0-9-]{36}\.[A-Za-z0-9+/=]{20,}/i
];

const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8", shell: false });
if (listed.status !== 0) throw new Error(listed.stderr.trim());

const findings = [];
for (const file of listed.stdout.split(/\r?\n/).filter(Boolean)) {
  if (!fs.existsSync(file) || fs.statSync(file).size > 2_000_000) continue;
  const content = fs.readFileSync(file, "utf8");
  if (patterns.some(pattern => pattern.test(content))) findings.push(file);
}

if (findings.length > 0) {
  console.error(`Potential secrets found in repository files:\n${findings.map(file => `- ${file}`).join("\n")}`);
  process.exit(1);
}

console.log("Secret scan passed.");
