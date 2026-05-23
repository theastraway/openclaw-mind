/**
 * mind_graph — Knowledge graph statistics + diagnostics.
 *
 * Replaces the legacy mind_query_graph tool. Matches canonical MCP-server
 * actions: stats (default), diagnostics, labels.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const GraphParameters = Type.Object({
  action: Type.Optional(
    Type.Union(
      [Type.Literal("stats"), Type.Literal("diagnostics"), Type.Literal("labels")],
      {
        description:
          "Action: stats (default — overview), diagnostics (health check), labels (entity label breakdown).",
      },
    ),
  ),
});

type GraphParams = Static<typeof GraphParameters>;

export function createMindGraphTool(deps: ToolDeps) {
  return {
    name: "mind_graph",
    label: "MIND Graph",
    description:
      "Get MIND knowledge graph statistics, diagnostics, and label details. Use to check graph health, growth, and entity breakdown.",
    parameters: GraphParameters,
    async execute(_toolCallId: string, params: GraphParams) {
      try {
        const action = params.action ?? "stats";
        switch (action) {
          case "stats": {
            const info = await deps.client.getGraphInfo();
            const entities = info.total_entities ?? info.entity_count ?? 0;
            const relationships = info.total_relationships ?? info.relationship_count ?? 0;
            const credits = info.credits_remaining ?? "—";
            const text = `Entities: ${entities} · Relationships: ${relationships} · Credits remaining: ${credits}`;
            return { content: [{ type: "text" as const, text }], details: info };
          }
          case "diagnostics": {
            const d = await deps.client.getGraphDiagnostics();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Graph diagnostics:\n${JSON.stringify(d, null, 2)}`,
                },
              ],
              details: d,
            };
          }
          case "labels": {
            const info = await deps.client.getGraphInfo();
            const labels = info.popular_labels ?? [];
            const text = labels.length
              ? `Top entity labels:\n${labels.map((l) => `• ${l.label ?? "(unlabeled)"} — ${l.count}`).join("\n")}`
              : "No label data yet.";
            return { content: [{ type: "text" as const, text }], details: { labels } };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_graph failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
