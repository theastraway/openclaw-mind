/**
 * `openclaw mind status` — Show MIND connection and account info.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";

export async function statusCommand(
  api: OpenClawPluginApi,
  client: MindClient | null,
  config: MindPluginConfig,
): Promise<void> {
  if (!client || config.needsSetup) {
    api.logger.info(
      [
        "MIND: NOT CONNECTED",
        "",
        "Run: openclaw mind init --api-key mind_your_key_here",
        "Get a key at https://www.m-i-n-d.ai → Settings → Developer",
      ].join("\n"),
    );
    return;
  }

  try {
    const info = await client.getGraphInfo();
    api.logger.info(
      [
        "MIND: CONNECTED",
        `  Base URL:        ${config.baseUrl}`,
        `  Entities:        ${info.entity_count ?? "?"}`,
        `  Relationships:   ${info.relationship_count ?? "?"}`,
        `  Storage health:  ${info.storage_health ?? "?"}`,
        `  Credits left:    ${info.credits_remaining ?? "?"}`,
        "",
        "Settings:",
        `  Auto-recall:      ${config.autoRecall}`,
        `  Auto-capture:     ${config.autoCapture}`,
        `  Top-K recall:     ${config.topK}`,
        `  Query mode:       ${config.queryMode}`,
        `  MINDsense:        ${config.enableMindsense}`,
        `  Life integration: ${config.enableLifeIntegration}`,
        `  CRM logging:      ${config.enableCrmLogging}`,
      ].join("\n"),
    );
  } catch (err) {
    api.logger.error(`Failed to reach MIND: ${(err as Error).message}`);
  }
}
