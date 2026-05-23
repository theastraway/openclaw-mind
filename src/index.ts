/**
 * @astramindapp/openclaw-mind
 *
 * MIND personal knowledge graph for OpenClaw.
 * 24 tools (143 actions), full canonical parity with @astramindapp/mcp-server.
 *
 * Tool surface (full):
 *   Memory + search:  mind_query, mind_remember, mind_context
 *   Organization:     mind_folders
 *   Work:             mind_life, mind_tasks, mind_crm
 *   Graph + sense:    mind_graph, mind_sense
 *   Self:             mind_profile, mind_insights, mind_research, mind_train
 *   Front Layer:      mind_save_typed, mind_list_templates, mind_get_template,
 *                     mind_bootstrap_templates
 *   Social:           mind_social
 *   Ops:              mind_notify, mind_automate
 *   Accounts:         mind_accounts
 *   Admin-only:       mind_admin, mind_agents, mind_tickets
 *
 * Plus lifecycle hooks an MCP server can't offer:
 *   - autoRecall: pulls relevant memories into context before each user turn
 *   - autoCapture: extracts entities/relationships/emotional weights on
 *     agent_end via the conversation-access hook
 *
 * Why a plugin and not an MCP server for OpenClaw:
 *   The MCP server (@astramindapp/mcp-server) targets generic MCP hosts
 *   (Claude Code, Cursor, Windsurf, n8n). OpenClaw uses this plugin because
 *   it gets first-class lifecycle hooks. Same MIND backend, same tool names,
 *   wider integration.
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
    "MIND personal knowledge graph for OpenClaw — 24 tools (memory, life, CRM, graph, MINDsense emotional intelligence, agents, tickets, social, automations, multi-MIND accounts). Auto-recall + auto-capture on every turn. Full parity with @astramindapp/mcp-server.",
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

    // 4. Register all 24 canonical tools
    registerAllTools(api, client, cfg);

    // 5. Register CLI subcommands (init, status, import, search)
    registerCliCommands(api, client, cfg);

    // 6. Register lifecycle hooks. Always registered — the once-per-session
    //    MIND briefing must run regardless of the auto-recall/auto-capture
    //    settings; recall and capture themselves stay gated by config.
    registerLifecycleHooks(api, client, cfg);

    // 7. Register a service so other plugins can reach the MIND client
    api.registerService({
      id: "openclaw-mind",
      start: () => {
        api.logger.info(
          `openclaw-mind v0.4.0 ready — 24 tools, autoRecall=${cfg.autoRecall} autoCapture=${cfg.autoCapture} baseUrl=${cfg.baseUrl}`,
        );
      },
    });
  },
});
