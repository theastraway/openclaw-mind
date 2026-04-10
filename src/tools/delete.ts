/**
 * mind_delete — Delete a memory by ID.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const DeleteParameters = Type.Object({
  id: Type.String({ description: "The memory ID to delete" }),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry")],
      { description: "Storage type. Default: 'document'" },
    ),
  ),
});

type DeleteParams = Static<typeof DeleteParameters>;

export function createMindDeleteTool(deps: ToolDeps) {
  return {
    name: "mind_delete",
    label: "MIND Delete Memory",
    description:
      "Delete a memory by its ID. KG entities and relationships sourced from this memory are removed. Use sparingly — prefer mind_update if content is just changing.",
    parameters: DeleteParameters,
    async execute(_toolCallId: string, params: DeleteParams) {
      try {
        const type = params.type ?? "document";
        if (type === "document") {
          await deps.client.deleteDocument(params.id);
        } else {
          await deps.client.deleteEntry(params.id);
        }
        return {
          content: [{ type: "text" as const, text: `Deleted ${type} ${params.id}` }],
          details: { id: params.id, status: "deleted" },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_delete failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
