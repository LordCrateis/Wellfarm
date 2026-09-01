import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const forwarded = process.argv.slice(2);
if (forwarded.length === 0) {
  console.error("Usage: node run_python.mjs <python arguments...>");
  process.exit(2);
}

const localPython = process.platform === "win32"
  ? join(process.cwd(), ".venv", "Scripts", "python.exe")
  : join(process.cwd(), ".venv", "bin", "python");
const codexPython = process.platform === "win32"
  ? join(
      homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "python",
      "python.exe",
    )
  : null;

const candidates = [
  process.env.PYTHON ? { command: process.env.PYTHON, prefix: [] } : null,
  { command: localPython, prefix: [] },
  { command: "python3", prefix: [] },
  { command: "python", prefix: [] },
  process.platform === "win32" ? { command: "py", prefix: ["-3"] } : null,
  codexPython ? { command: codexPython, prefix: [] } : null,
].filter(Boolean);

for (const candidate of candidates) {
  if (candidate.command.includes("/") || candidate.command.includes("\\")) {
    try {
      accessSync(resolve(candidate.command), constants.X_OK);
    } catch {
      continue;
    }
  }
  const probe = spawnSync(candidate.command, [...candidate.prefix, "--version"], {
    encoding: "utf8",
    shell: false,
  });
  if (probe.error || probe.status !== 0) continue;

  const result = spawnSync(candidate.command, [...candidate.prefix, ...forwarded], {
    stdio: "inherit",
    shell: false,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error(
  "Python 3 was not found. Install Python, create .venv, or set the PYTHON environment variable.",
);
process.exit(1);
