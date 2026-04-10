/**
 * Auth file persistence at ~/.openclaw/plugins/openclaw-mind.json.
 *
 * Stores the user's API key + base URL so they don't need to set env vars.
 * The plugin reads this on startup via the readPluginAuth helper.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const AUTH_DIR = path.join(os.homedir(), ".openclaw", "plugins");
const AUTH_FILE = path.join(AUTH_DIR, "openclaw-mind.json");

export interface AuthFile {
  apiKey: string;
  baseUrl?: string;
}

export async function writeAuthFile(auth: AuthFile): Promise<void> {
  await fs.mkdir(AUTH_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

export async function readAuthFile(): Promise<AuthFile | null> {
  try {
    const text = await fs.readFile(AUTH_FILE, "utf8");
    return JSON.parse(text) as AuthFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
