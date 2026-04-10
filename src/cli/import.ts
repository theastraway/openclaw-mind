/**
 * `openclaw mind import` — Migrate OpenClaw workspace memory files into MIND.
 *
 * Reads files from ~/.openclaw/workspace/:
 *   - SOUL.md, IDENTITY.md, USER.md, MEMORY.md (if they exist)
 *   - memory/YYYY-MM-DD.md files (most recent N days)
 *
 * Skips: AGENTS.md, BOOTSTRAP.md, HEARTBEAT.md, TOOLS.md (operational, not memory).
 *
 * Each file becomes a MIND document, which triggers automatic entity + relationship
 * extraction on the server side. Files >2000 words are split by H1 heading.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const ALWAYS_IMPORT = ["SOUL.md", "IDENTITY.md", "USER.md", "MEMORY.md"];
const SKIP = new Set(["AGENTS.md", "BOOTSTRAP.md", "HEARTBEAT.md", "TOOLS.md"]);
const WORDS_PER_DOCUMENT_THRESHOLD = 2000;

interface ImportOpts {
  workspace?: string;
  days?: string;
}

export async function importCommand(
  api: OpenClawPluginApi,
  client: MindClient | null,
  config: MindPluginConfig,
  opts: ImportOpts,
): Promise<void> {
  if (!client || config.needsSetup) {
    api.logger.error("MIND not configured. Run: openclaw mind init --api-key mind_...");
    return;
  }

  const workspace = opts.workspace ?? path.join(os.homedir(), ".openclaw", "workspace");
  const days = parseInt(opts.days ?? "30", 10);

  if (!(await pathExists(workspace))) {
    api.logger.error(`Workspace not found: ${workspace}`);
    return;
  }

  api.logger.info(`Scanning ${workspace}...`);

  const items: Array<{ title: string; content: string; tags: string[] }> = [];

  // 1. Always-import top-level files
  for (const filename of ALWAYS_IMPORT) {
    const filepath = path.join(workspace, filename);
    if (await pathExists(filepath)) {
      const content = await fs.readFile(filepath, "utf8");
      items.push(...splitFile(filename, content, ["openclaw-import", "core-memory"]));
    }
  }

  // 2. Recent memory dir files
  const memoryDir = path.join(workspace, "memory");
  if (await pathExists(memoryDir)) {
    const files = await fs.readdir(memoryDir);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const dateFiles = files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();

    for (const file of dateFiles) {
      const dateStr = file.replace(".md", "");
      const fileTime = new Date(dateStr).getTime();
      if (Number.isNaN(fileTime) || fileTime < cutoff) continue;

      const filepath = path.join(memoryDir, file);
      const content = await fs.readFile(filepath, "utf8");
      items.push(...splitFile(file, content, ["openclaw-import", "daily-memory", dateStr]));
    }
  }

  // 3. Show preview
  if (items.length === 0) {
    api.logger.info("Nothing to import.");
    return;
  }

  api.logger.info(`Found ${items.length} memory chunks. Importing to MIND...`);

  // 4. Import in series (avoid hammering the API)
  let succeeded = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await client.createDocument({
        title: item.title,
        content: item.content,
        tags: item.tags,
        source: "openclaw-mind-import",
      });
      succeeded++;
    } catch (err) {
      failed++;
      api.logger?.warn(`Failed to import "${item.title}": ${(err as Error).message}`);
    }
  }

  api.logger.info(
    `Done. Imported: ${succeeded}, failed: ${failed}. Run \`openclaw mind status\` to see updated entity count.`,
  );
}

function splitFile(
  filename: string,
  content: string,
  tags: string[],
): Array<{ title: string; content: string; tags: string[] }> {
  if (SKIP.has(filename)) return [];
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount <= WORDS_PER_DOCUMENT_THRESHOLD) {
    return [
      {
        title: `${filename}`,
        content: content.trim(),
        tags,
      },
    ];
  }

  // Split by H1 headings if file is large
  const sections: Array<{ title: string; content: string; tags: string[] }> = [];
  const lines = content.split("\n");
  let currentTitle = filename;
  let currentBuffer: string[] = [];

  const flush = () => {
    const text = currentBuffer.join("\n").trim();
    if (text.length > 0) {
      sections.push({ title: currentTitle, content: text, tags });
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      flush();
      currentBuffer = [line];
      currentTitle = `${filename} — ${line.replace(/^#\s*/, "").trim()}`;
    } else {
      currentBuffer.push(line);
    }
  }
  flush();

  return sections;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}
