/**
 * mind_get — Retrieve a single memory by ID.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const GetParameters = Type.Object({
  id: Type.String({ description: "The memory ID to retrieve" }),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry")],
      { description: "Storage type. Default: 'document'" },
    ),
  ),
});

type GetParams = Static<typeof GetParameters>;

export function createMindGetTool(deps: ToolDeps) {
  return {
    name: "mind_get",
    label: "MIND Get Memory",
    description: "Retrieve a single memory by its ID. Returns full content, metadata, tags, timestamps.",
    parameters: GetParameters,
    async execute(_toolCallId: string, params: GetParams) {
      try {
        const type = params.type ?? "document";
        let result: unknown;
        if (type === "document") {
          result = await deps.client.getDocument(params.id);
        } else {
          const list = await deps.client.listEntries({ limit: 100 });
          result = list.entries.find((e) => e.id === params.id);
          if (!result) {
            return {
              content: [{ type: "text" as const, text: `Entry ${params.id} not found` }],
              details: { error: "not_found" },
            };
          }
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_get failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
