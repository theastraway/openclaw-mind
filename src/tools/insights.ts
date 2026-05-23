/**
 * mind_insights — Autonomous Learning Engine insights.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const InsightsParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("unread_count"),
      Type.Literal("view"),
      Type.Literal("feedback"),
      Type.Literal("analyze"),
      Type.Literal("weekly_summary"),
      Type.Literal("context"),
    ],
    { description: "Action: list, unread_count, view, feedback, analyze, weekly_summary, context." },
  ),
  insight_id: Type.Optional(Type.String({ description: "Insight ID — required for view/feedback." })),
  limit: Type.Optional(Type.Number({ description: "Max insights to return. Default: 10." })),
  rating: Type.Optional(
    Type.Union([Type.Literal("helpful"), Type.Literal("not_helpful")], {
      description: "Rating for feedback action.",
    }),
  ),
});

type InsightsParams = Static<typeof InsightsParameters>;

export function createMindInsightsTool(deps: ToolDeps) {
  return {
    name: "mind_insights",
    label: "MIND Insights",
    description:
      "Access insights from MIND's Autonomous Learning Engine — patterns detected in your knowledge graph, weekly summaries, and proactive intelligence. Also trigger on-demand analysis.",
    parameters: InsightsParameters,
    async execute(_toolCallId: string, params: InsightsParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listInsights({ limit: params.limit ?? 10 });
            const lines = (r.insights ?? []).map(
              (i) => `• [${i.priority ?? "info"}] ${i.title ?? i.insight_type ?? "(untitled)"} — ${i.message ?? ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length
                    ? `${r.total} insight(s), ${r.unread} unread:\n${lines.join("\n")}`
                    : "No insights yet.",
                },
              ],
              details: r,
            };
          }
          case "unread_count": {
            const r = await deps.client.insightsUnreadCount();
            return {
              content: [{ type: "text" as const, text: `${r.count} unread insight(s).` }],
              details: r,
            };
          }
          case "view": {
            if (!params.insight_id) {
              return {
                content: [{ type: "text" as const, text: "'insight_id' is required." }],
                details: { error: "missing_insight_id" },
              };
            }
            const r = await deps.client.viewInsight(params.insight_id);
            return { content: [{ type: "text" as const, text: `Marked viewed.` }], details: r };
          }
          case "feedback": {
            if (!params.insight_id || !params.rating) {
              return {
                content: [{ type: "text" as const, text: "'insight_id' and 'rating' are required." }],
                details: { error: "missing_params" },
              };
            }
            await deps.client.insightFeedback(params.insight_id, params.rating);
            return { content: [{ type: "text" as const, text: `Feedback recorded.` }], details: { ok: true } };
          }
          case "analyze": {
            const r = await deps.client.analyzeInsights();
            return {
              content: [{ type: "text" as const, text: "Analysis triggered." }],
              details: r,
            };
          }
          case "weekly_summary": {
            const r = await deps.client.weeklySummary();
            return {
              content: [{ type: "text" as const, text: r.summary ?? r.summary_text ?? "(no summary yet)" }],
              details: r,
            };
          }
          case "context": {
            const r = await deps.client.insightsContext();
            return {
              content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_insights failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
