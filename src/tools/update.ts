/**
 * mind_update — Update an existing memory via delete + recreate (preserves KG).
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const UpdateParameters = Type.Object({
  id: Type.String({ description: "The memory ID to update" }),
  content: Type.String({ description: "New content. Replaces the existing content." }),
  title: Type.Optional(Type.String({ description: "New title." })),
  tags: Type.Optional(Type.Array(Type.String())),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry")],
      { description: "Storage type. Default: 'document'" },
    ),
  ),
});

type UpdateParams = Static<typeof UpdateParameters>;

export function createMindUpdateTool(deps: ToolDeps) {
  return {
    name: "mind_update",
    label: "MIND Update Memory",
    description:
      "Update an existing memory's content, title, or tags. The KG is re-extracted from the new content automatically. Use when a stored fact has changed (e.g., user's role, deadline shift, decision update).",
    parameters: UpdateParameters,
    async execute(_toolCallId: string, params: UpdateParams) {
      try {
        const type = params.type ?? "document";

        if (type === "document") {
          const original = await deps.client.getDocument(params.id);
          await deps.client.deleteDocument(params.id);
          const created = await deps.client.createDocument({
            title: params.title ?? original.title,
            content: params.content,
            tags: params.tags ?? original.tags,
            source: "openclaw-mind",
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Updated memory. New id: ${created.id} (was: ${params.id})`,
              },
            ],
            details: { id: created.id, previous_id: params.id, title: created.title },
          };
        }

        await deps.client.deleteEntry(params.id);
        const entry = await deps.client.createEntry({
          title: params.title,
          content: params.content,
          type: "entry",
          tags: params.tags,
          source: "openclaw-mind",
        });
        return {
          content: [
            { type: "text" as const, text: `Updated entry. New id: ${entry.id} (was: ${params.id})` },
          ],
          details: { id: entry.id, previous_id: params.id, title: entry.title },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_update failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
