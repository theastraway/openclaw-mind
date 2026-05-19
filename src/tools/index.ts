/**
 * Tool registration entry point.
 *
 * Each tool is defined in its own file and registered here. The pattern mirrors
 * Mem0's openclaw plugin: each `create*Tool` factory takes a deps object
 * (client + config) and returns a tool definition for `api.registerTool`.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";

import { createMindSearchTool } from "./search.js";
import { createMindAddTool } from "./add.js";
import { createMindGetTool } from "./get.js";
import { createMindListTool } from "./list.js";
import { createMindUpdateTool } from "./update.js";
import { createMindDeleteTool } from "./delete.js";
import { createMindFoldersTool } from "./folders.js";
import { createMindQueryGraphTool } from "./query-graph.js";
import { createMindRecallEmotionalTool } from "./recall-emotional.js";
import { createMindContextTool } from "./context.js";
import { createMindLifeTool } from "./life.js";
import { createMindTasksTool } from "./tasks.js";
import { createMindCrmLogTool } from "./crm-log.js";

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

  // Core memory CRUD (parity with Mem0)
  api.registerTool(createMindSearchTool(deps));
  api.registerTool(createMindAddTool(deps));
  api.registerTool(createMindGetTool(deps));
  api.registerTool(createMindListTool(deps));
  api.registerTool(createMindUpdateTool(deps));
  api.registerTool(createMindDeleteTool(deps));

  // Document organization
  api.registerTool(createMindFoldersTool(deps));

  // MIND-unique capabilities
  api.registerTool(createMindQueryGraphTool(deps));
  if (config.enableMindsense) {
    api.registerTool(createMindRecallEmotionalTool(deps));
  }
  api.registerTool(createMindContextTool(deps));
  if (config.enableLifeIntegration) {
    api.registerTool(createMindLifeTool(deps));
    api.registerTool(createMindTasksTool(deps));
  }
  if (config.enableCrmLogging) {
    api.registerTool(createMindCrmLogTool(deps));
  }
}
