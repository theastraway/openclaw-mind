/**
 * mind_query — Hybrid semantic + knowledge graph search.
 *
 * Replaces the legacy mind_search tool with the canonical MCP-server name.
 * Wraps POST /developer/v1/query. Uses MIND's LightRAG hybrid mode by
 * default — blends vector similarity AND graph traversal.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const QueryParameters = Type.Object({
  query: Type.String({ description: "What to search for in your knowledge graph." }),
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
          "Search mode. 'hybrid' (default — combines semantic + graph), 'mix' (balanced), 'global' (broad), 'local' (focused), 'naive' (vector-only).",
      },
    ),
  ),
  top_k: Type.Optional(
    Type.Number({
      description: "Maximum number of memories to return. Default: 10.",
      minimum: 1,
      maximum: 100,
    }),
  ),
});

type QueryParams = Static<typeof QueryParameters>;

export function createMindQueryTool(deps: ToolDeps) {
  return {
    name: "mind_query",
    label: "MIND Query",
    description:
      "Search your MIND knowledge graph. Returns an AI-synthesized answer grounded in stored documents, entries, and thoughts. Use this BEFORE making decisions — MIND is your memory. Default mode (hybrid) blends vector similarity with graph traversal, so it surfaces related entities, not just textually similar memories.",
    parameters: QueryParameters,
    async execute(_toolCallId: string, params: QueryParams) {
      try {
        const result = await deps.client.query({
          query: params.query,
          mode: params.mode ?? deps.config.queryMode,
          top_k: params.top_k ?? deps.config.topK,
        });

        const sources = Array.isArray(result.sources) ? result.sources : [];
        const sourceList =
          sources.length > 0
            ? `\n\nSources:\n${sources
                .slice(0, 5)
                .map((s, i) => {
                  if (typeof s === "string") return `${i + 1}. ${s}`;
                  return `${i + 1}. ${s.title ?? s.id ?? "(untitled)"}`;
                })
                .join("\n")}`
            : "";

        return {
          content: [{ type: "text" as const, text: `${result.answer}${sourceList}` }],
          details: result,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_query failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
