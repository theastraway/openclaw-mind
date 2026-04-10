/**
 * mind_list — Paginated list of stored memories.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const ListParameters = Type.Object({
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry"), Type.Literal("all")],
      { description: "Filter by storage type. Default: 'all'" },
    ),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Maximum number to return. Default: 20", minimum: 1, maximum: 100 }),
  ),
  offset: Type.Optional(Type.Number({ description: "Pagination offset. Default: 0", minimum: 0 })),
});

type ListParams = Static<typeof ListParameters>;

export function createMindListTool(deps: ToolDeps) {
  return {
    name: "mind_list",
    label: "MIND List",
    description:
      "List stored memories with pagination. Returns IDs, titles, types, tags, timestamps. Use for browsing or when the agent needs to enumerate before deciding what to retrieve.",
    parameters: ListParameters,
    async execute(_toolCallId: string, params: ListParams) {
      try {
        const limit = params.limit ?? 20;
        const offset = params.offset ?? 0;
        const type = params.type ?? "all";
        const result: { documents?: unknown[]; entries?: unknown[] } = {};

        if (type === "document" || type === "all") {
          const docs = await deps.client.listDocuments({ limit, offset });
          result.documents = docs.documents;
        }
        if (type === "entry" || type === "all") {
          const entries = await deps.client.listEntries({ limit, offset });
          result.entries = entries.entries;
        }

        const summary = [
          `${result.documents?.length ?? 0} documents`,
          `${result.entries?.length ?? 0} entries`,
        ].join(", ");

        return {
          content: [{ type: "text" as const, text: `${summary}\n\n${JSON.stringify(result, null, 2)}` }],
          details: result,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_list failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
