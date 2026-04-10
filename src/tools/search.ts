/**
 * mind_search — Hybrid semantic + knowledge graph search.
 *
 * Wraps POST /developer/v1/query. Uses MIND's LightRAG hybrid mode by default,
 * which blends vector similarity AND graph traversal. Beats pure-vector tools
 * like Mem0 because it surfaces related entities, not just textually similar
 * memories.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const SearchParameters = Type.Object({
  query: Type.String({ description: "What to search for" }),
  mode: Type.Optional(
    Type.Union(
      [
        Type.Literal("hybrid"),
        Type.Literal("mix"),
        Type.Literal("global"),
        Type.Literal("local"),
        Type.Literal("naive"),
      ],
      {
        description:
          "Query mode. 'hybrid' (default) blends vector + graph. 'global' synthesizes across the full graph. 'local' is entity-focused.",
      },
    ),
  ),
  top_k: Type.Optional(
    Type.Number({
      description: "Maximum number of memories to return. Default: 10",
      minimum: 1,
      maximum: 100,
    }),
  ),
});

type SearchParams = Static<typeof SearchParameters>;

export function createMindSearchTool(deps: ToolDeps) {
  return {
    name: "mind_search",
    label: "MIND Search",
    description:
      "Search the MIND knowledge graph using hybrid semantic + graph queries. Returns an AI-synthesized answer grounded in stored memories. Use this whenever the agent needs prior context, decisions, preferences, or facts about the user. MIND's true KG beats vector-only tools because it follows entity relationships, not just text similarity.",
    parameters: SearchParameters,
    async execute(_toolCallId: string, params: SearchParams) {
      try {
        const result = await deps.client.query({
          query: params.query,
          mode: params.mode ?? deps.config.queryMode,
          top_k: params.top_k ?? deps.config.topK,
        });

        const sources = result.sources ?? [];
        const sourceList =
          sources.length > 0
            ? `\n\nSources:\n${sources
                .slice(0, 5)
                .map((s, i) => `${i + 1}. ${s.title ?? "(untitled)"}`)
                .join("\n")}`
            : "";

        return {
          content: [{ type: "text" as const, text: `${result.answer}${sourceList}` }],
          details: {
            answer: result.answer,
            sources,
            model_used: result.model_used,
          },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `MIND search failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
