import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";

function findEnvironmentFile(startDirectory: string): string | undefined {
  let directory = resolve(startDirectory);

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }

  return undefined;
}

const environmentFile = findEnvironmentFile(process.cwd());

if (!process.env.DATABASE_PATH && environmentFile) {
  loadEnvFile(environmentFile);
}

const configuredPath = process.env.DATABASE_PATH ?? "./data/wellfarm-demo.sqlite";
const baseDirectory = environmentFile ? dirname(environmentFile) : process.cwd();

export const databasePath = isAbsolute(configuredPath)
  ? configuredPath
  : resolve(baseDirectory, configuredPath);

mkdirSync(dirname(databasePath), { recursive: true });
