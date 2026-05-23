/**
 * mind_list_templates — List the 16 Front Layer template types.
 */

import { Type } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const ListTemplatesParameters = Type.Object({});

export function createMindListTemplatesTool(deps: ToolDeps) {
  return {
    name: "mind_list_templates",
    label: "MIND List Templates",
    description:
      "List the 16 MIND Front Layer template types (SOUL, IDENTITY, BELIEFS, USER, AGENTS, TOOLS, SENSES, SKILLS, BEHAVIOR, LESSON, DECISION, POLICY, WORKFLOW, PREFERENCE, GOAL, RELATIONSHIP). Each entry includes a short description and the source_tag used when storing filled documents.",
    parameters: ListTemplatesParameters,
    async execute() {
      try {
        const r = await deps.client.listFrontLayerTemplates();
        const lines = (r.templates ?? []).map(
          (t) => `• ${t.type} — ${t.description}`,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `${r.count ?? r.templates.length} template(s) (v${r.version}):\n${lines.join("\n")}`,
            },
          ],
          details: r,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_list_templates failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
