import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { databasePath } from "./src/config";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(packageDirectory, "src/schema/index.ts"),
  out: path.join(packageDirectory, "drizzle"),
  dialect: "sqlite",
  dbCredentials: {
    url: databasePath,
  },
});
