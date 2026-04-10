/**
 * @astramindapp/openclaw-mind
 *
 * MIND personal knowledge graph for OpenClaw.
 * 11 tools, 4 skills, full lifecycle hooks.
 *
 * Pattern modeled on @mem0/openclaw-mem0 (Apache-2.0). Differences:
 * - True knowledge graph backend (LightRAG) instead of vectors
 * - MINDsense emotional weighting on every captured fact (patented)
 * - 11 tools vs Mem0's 8 (adds query_graph, recall_emotional, context, life, crm_log)
 * - 4 skills vs Mem0's 2 (adds emotional-encoding, graph-recall)
 * - Backed by the MIND personal AI platform with 50+ models, life mgmt, CRM, social
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { MindClient } from "./mind-client.js";
import { resolveConfig, type MindPluginConfig, type RawPluginConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { registerCliCommands } from "./cli/index.js";
import { registerLifecycleHooks } from "./hooks/index.js";

const SETUP_MESSAGE = [
  "openclaw-mind: MIND_API_KEY not configured. Memory features are disabled.",
  "  To set up:",
  "    1. Get a key at https://www.m-i-n-d.ai → Settings → Developer",
  "    2. Run: openclaw mind init --api-key mind_your_key_here",
  "  Or set MIND_API_KEY in your environment.",
].join("\n");

export default definePluginEntry({
  id: "openclaw-mind",
  name: "MIND",
  description:
    "MIND personal knowledge graph for OpenClaw — true KG, 50+ AI models, MINDsense emotional intelligence, life management, CRM. The most complete memory plugin for AI agents.",
  kind: "memory",

  register(api) {
    // 1. Resolve config from plugin settings + env vars
    const cfg: MindPluginConfig = resolveConfig(api.pluginConfig as RawPluginConfig | undefined);

    // 2. Bail gracefully if not configured — register CLI so user can run init
    if (cfg.needsSetup) {
      api.logger.warn(SETUP_MESSAGE);
      registerCliCommands(api, null, cfg);
      api.registerService({
        id: "openclaw-mind",
        start: () => {
          api.logger.info("openclaw-mind: waiting for API key configuration");
        },
      });
      return;
    }

    // 3. Build the MIND HTTP client
    const client = new MindClient({
      apiKey: cfg.apiKey!,
      baseUrl: cfg.baseUrl,
      logger: api.logger,
    });

    // 4. Register all 11 tools
    registerAllTools(api, client, cfg);

    // 5. Register CLI subcommands (init, status, import, search)
    registerCliCommands(api, client, cfg);

    // 6. Register lifecycle hooks (auto-recall + auto-capture)
    if (cfg.autoRecall || cfg.autoCapture) {
      registerLifecycleHooks(api, client, cfg);
    }

    // 7. Register a service so other plugins can reach the MIND client
    api.registerService({
      id: "openclaw-mind",
      start: () => {
        api.logger.info(
          `openclaw-mind v0.1.0 ready — autoRecall=${cfg.autoRecall} autoCapture=${cfg.autoCapture} baseUrl=${cfg.baseUrl}`,
        );
      },
    });
  },
});
