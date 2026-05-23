/**
 * Tool registration entry point — full 24-tool canonical surface.
 *
 * Every tool here matches @astramindapp/mcp-server v0.12.x by name, action,
 * and parameter shape. An OpenClaw agent and a Claude Code agent talk to
 * MIND identically.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";

// Memory + search
import { createMindQueryTool } from "./query.js";
import { createMindRememberTool } from "./remember.js";
import { createMindContextTool } from "./context.js";

// Document organization
import { createMindFoldersTool } from "./folders.js";

// Life + tasks + CRM
import { createMindLifeTool } from "./life.js";
import { createMindTasksTool } from "./tasks.js";
import { createMindCrmTool } from "./crm.js";

// Knowledge graph + emotional intelligence
import { createMindGraphTool } from "./graph.js";
import { createMindSenseTool } from "./sense.js";

// Profile + insights + research + training
import { createMindProfileTool } from "./profile.js";
import { createMindInsightsTool } from "./insights.js";
import { createMindResearchTool } from "./research.js";
import { createMindTrainTool } from "./train.js";

// Front Layer typed documents
import { createMindSaveTypedTool } from "./save-typed.js";
import { createMindListTemplatesTool } from "./list-templates.js";
import { createMindGetTemplateTool } from "./get-template.js";
import { createMindBootstrapTemplatesTool } from "./bootstrap-templates.js";

// Social
import { createMindSocialTool } from "./social.js";

// Notifications + automations
import { createMindNotifyTool } from "./notify.js";
import { createMindAutomateTool } from "./automate.js";

// Multi-MIND accounts
import { createMindAccountsTool } from "./accounts.js";

// Admin-only
import { createMindAdminTool } from "./admin.js";
import { createMindAgentsTool } from "./agents.js";
import { createMindTicketsTool } from "./tickets.js";

export interface ToolDeps {
  client: MindClient;
  config: MindPluginConfig;
}

export function registerAllTools(
  api: OpenClawPluginApi,
  client: MindClient,
  config: MindPluginConfig,
): void {
  const deps: ToolDeps = { client, config };

  // Memory + search (3) — the everyday surface
  api.registerTool(createMindQueryTool(deps));
  api.registerTool(createMindRememberTool(deps));
  api.registerTool(createMindContextTool(deps));

  // Document organization (1)
  api.registerTool(createMindFoldersTool(deps));

  // Life + tasks + CRM (3)
  if (config.enableLifeIntegration) {
    api.registerTool(createMindLifeTool(deps));
    api.registerTool(createMindTasksTool(deps));
  }
  if (config.enableCrmLogging) {
    api.registerTool(createMindCrmTool(deps));
  }

  // Knowledge graph + emotional intelligence (2)
  api.registerTool(createMindGraphTool(deps));
  if (config.enableMindsense) {
    api.registerTool(createMindSenseTool(deps));
  }

  // Profile + insights + research + training (4)
  api.registerTool(createMindProfileTool(deps));
  api.registerTool(createMindInsightsTool(deps));
  api.registerTool(createMindResearchTool(deps));
  api.registerTool(createMindTrainTool(deps));

  // Front Layer typed documents (4)
  api.registerTool(createMindSaveTypedTool(deps));
  api.registerTool(createMindListTemplatesTool(deps));
  api.registerTool(createMindGetTemplateTool(deps));
  api.registerTool(createMindBootstrapTemplatesTool(deps));

  // Social (1)
  api.registerTool(createMindSocialTool(deps));

  // Notifications + automations (2)
  api.registerTool(createMindNotifyTool(deps));
  api.registerTool(createMindAutomateTool(deps));

  // Multi-MIND accounts (1)
  api.registerTool(createMindAccountsTool(deps));

  // Admin-only (3) — only useful with an admin-scoped MIND API key
  api.registerTool(createMindAdminTool(deps));
  api.registerTool(createMindAgentsTool(deps));
  api.registerTool(createMindTicketsTool(deps));

  // Total: 24 canonical tools (or 22 with MINDsense/Life disabled).
}
