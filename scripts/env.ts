import fs from "node:fs";
import path from "node:path";

/** Loads `.env` from the project root into `process.env`, if it exists. */
export function loadDotEnv(root: string): void {
  const file = path.join(root, ".env");
  if (fs.existsSync(file)) {
    process.loadEnvFile(file);
  }
}
