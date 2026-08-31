import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const isWindows = process.platform === "win32";
const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const apiPort = process.env.API_PORT ?? "8000";
const webPort = process.env.WEB_PORT ?? "5173";

const build = spawnSync(
  pnpmCommand,
  ["--filter", "@workspace/api-server", "run", "build"],
  {
    cwd: workspaceDirectory,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
    shell: isWindows,
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const api = spawn(
  pnpmCommand,
  ["--filter", "@workspace/api-server", "run", "start"],
  {
    cwd: workspaceDirectory,
    env: { ...process.env, NODE_ENV: "development", PORT: apiPort },
    stdio: "inherit",
    shell: isWindows,
  },
);

const web = spawn(
  pnpmCommand,
  ["--filter", "@workspace/wellfarm", "run", "dev"],
  {
    cwd: workspaceDirectory,
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: webPort,
      BASE_PATH: "/",
      API_PORT: apiPort,
    },
    stdio: "inherit",
    shell: isWindows,
  },
);

const children = [api, web];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) {
    return;
  }

  stopping = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      stop(code ?? 1);
    }
  });
}
