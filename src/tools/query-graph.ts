/**
 * mind_query_graph — UNIQUE TO MIND
 *
 * Graph traversal queries over the MIND knowledge graph. Vector-only memory
 * tools cannot do this — they only do similarity search. MIND has a real KG
 * (LightRAG) so the agent can ask graph-shaped questions like "who is connected
 * to X" or "what concepts cluster around Y".
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const QueryGraphParameters = Type.Object({
  question: Type.String({
    description:
      "A graph-shaped question. Examples: 'Who is connected to Sarah?', 'What concepts cluster around the KGC pitch?', 'What decisions are linked to the auth migration?'",
  }),
  mode: Type.Optional(
    Type.Union([Type.Literal("global"), Type.Literal("local"), Type.Literal("mix")], {
      description:
        "Graph query mode. 'global' (default) synthesizes across the full graph. 'local' is entity-focused. 'mix' balances both.",
    }),
  ),
});

type QueryGraphParams = Static<typeof QueryGraphParameters>;

export function createMindQueryGraphTool(deps: ToolDeps) {
  return {
    name: "mind_query_graph",
    label: "MIND Graph Query",
    description:
      "Query the MIND knowledge graph by structure, not just similarity. Use for questions about RELATIONSHIPS between entities. Example: mind_search answers 'what did the user say about Sarah?'; mind_query_graph answers 'who is Sarah connected to and how?'. This is a true KG capability vector-only memory tools cannot match.",
    parameters: QueryGraphParameters,
    async execute(_toolCallId: string, params: QueryGraphParams) {
      try {
        const result = await deps.client.query({
          query: params.question,
          mode: params.mode ?? "global",
          top_k: 30,
        });
        return {
          content: [{ type: "text" as const, text: result.answer }],
          details: {
            answer: result.answer,
            sources: result.sources ?? [],
            mode: params.mode ?? "global",
          },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_query_graph failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
