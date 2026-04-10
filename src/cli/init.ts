/**
 * `openclaw mind init` — Set up the MIND API key.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindPluginConfig } from "../config.js";
import { MindClient } from "../mind-client.js";
import { writeAuthFile } from "./auth-file.js";

interface InitOpts {
  apiKey?: string;
  email?: string;
  baseUrl?: string;
}

export async function initCommand(
  api: OpenClawPluginApi,
  opts: InitOpts,
  config: MindPluginConfig,
): Promise<void> {
  const baseUrl = opts.baseUrl ?? config.baseUrl;

  if (opts.apiKey) {
    return setupWithApiKey(api, opts.apiKey, baseUrl);
  }

  if (opts.email) {
    return setupWithMagicLink(api, opts.email, baseUrl);
  }

  api.logger.info(
    [
      "To set up MIND, provide an API key or email:",
      "",
      "  openclaw mind init --api-key mind_your_key_here",
      "  openclaw mind init --email you@example.com",
      "",
      "Get an API key at https://www.m-i-n-d.ai → Settings → Developer → Create API Key",
    ].join("\n"),
  );
}

async function setupWithApiKey(
  api: OpenClawPluginApi,
  apiKey: string,
  baseUrl: string,
): Promise<void> {
  if (!apiKey.startsWith("mind_")) {
    api.logger.error("Invalid API key format. Keys must start with 'mind_'.");
    return;
  }

  const client = new MindClient({ apiKey, baseUrl, logger: api.logger });
  try {
    const info = await client.getGraphInfo();
    api.logger.info(
      [
        "✓ Connected to MIND",
        `  Entities: ${info.entity_count ?? "?"}`,
        `  Relationships: ${info.relationship_count ?? "?"}`,
        `  Credits remaining: ${info.credits_remaining ?? "?"}`,
      ].join("\n"),
    );

    await writeAuthFile({ apiKey, baseUrl });
    api.logger.info("✓ API key saved. MIND auto-recall and auto-capture are now active.");
  } catch (err) {
    api.logger.error(
      `Failed to verify MIND API key: ${(err as Error).message}\nDouble-check the key at https://www.m-i-n-d.ai/settings/developer`,
    );
  }
}

async function setupWithMagicLink(
  api: OpenClawPluginApi,
  _email: string,
  _baseUrl: string,
): Promise<void> {
  api.logger.error(
    [
      "Magic-link auth is coming in v0.2. For now, use --api-key:",
      "",
      "  openclaw mind init --api-key mind_your_key_here",
      "",
      "Get a key at https://www.m-i-n-d.ai → Settings → Developer.",
    ].join("\n"),
  );
}
