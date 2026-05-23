/**
 * mind_get_template — Fetch the full augmented markdown for one Front Layer template.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const GetTemplateParameters = Type.Object({
  type: Type.String({
    description: "One of the 16 canonical types, upper-case (e.g. SOUL, BEHAVIOR, LESSON, POLICY, GOAL).",
  }),
});

type GetTemplateParams = Static<typeof GetTemplateParameters>;

export function createMindGetTemplateTool(deps: ToolDeps) {
  return {
    name: "mind_get_template",
    label: "MIND Get Template",
    description:
      "Fetch the full augmented markdown for one MIND Front Layer template. Returns a self-contained spec — when to create a document of this type, what slots to fill, and how to store the filled copy. Always read the template before writing a typed document.",
    parameters: GetTemplateParameters,
    async execute(_toolCallId: string, params: GetTemplateParams) {
      try {
        const t = await deps.client.getFrontLayerTemplate(params.type);
        return {
          content: [{ type: "text" as const, text: t.body }],
          details: t,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_get_template failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
