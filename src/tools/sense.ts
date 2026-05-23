/**
 * mind_sense — MINDsense emotional intelligence layer.
 *
 * Umbrella replacement for the legacy mind_recall_emotional tool. Matches
 * canonical MCP-server actions: state, signals, timeline, kg_weights,
 * spikes, acknowledge, summary.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const SenseParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("state"),
      Type.Literal("signals"),
      Type.Literal("timeline"),
      Type.Literal("kg_weights"),
      Type.Literal("spikes"),
      Type.Literal("acknowledge"),
      Type.Literal("summary"),
    ],
    {
      description:
        "Action: state (current emotion), signals (recent), timeline (historical), kg_weights (emotionally weighted entities), spikes (recent spikes), acknowledge (ack a spike), summary (AI emotional summary).",
    },
  ),
  days: Type.Optional(Type.Number({ description: "Lookback days. Default: 7." })),
  limit: Type.Optional(Type.Number({ description: "Max items. Default: 20." })),
  signal_id: Type.Optional(Type.String({ description: "Signal ID — required for acknowledge." })),
});

type SenseParams = Static<typeof SenseParameters>;

export function createMindSenseTool(deps: ToolDeps) {
  return {
    name: "mind_sense",
    label: "MIND Sense",
    description:
      "Access MINDsense emotional intelligence — the user's living emotional state, signal history, emotional timeline, and KG entity weights. Use this to understand how the user is feeling and what emotionally significant events have occurred.",
    parameters: SenseParameters,
    async execute(_toolCallId: string, params: SenseParams) {
      try {
        const days = params.days ?? 7;
        const limit = params.limit ?? 20;
        switch (params.action) {
          case "state": {
            const s = await deps.client.mindsenseState();
            return {
              content: [
                { type: "text" as const, text: `Current emotional state:\n${JSON.stringify(s, null, 2)}` },
              ],
              details: s,
            };
          }
          case "signals": {
            const s = await deps.client.mindsenseSignals(days, limit);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${s.signals?.length ?? 0} recent signal(s) over the last ${days} day(s).`,
                },
              ],
              details: s,
            };
          }
          case "timeline": {
            const t = await deps.client.mindsenseTimeline(days);
            return {
              content: [
                { type: "text" as const, text: `${t.timeline?.length ?? 0} timeline entry(ies) over ${days} day(s).` },
              ],
              details: t,
            };
          }
          case "kg_weights": {
            const w = await deps.client.mindsenseKgWeights(limit);
            return {
              content: [
                { type: "text" as const, text: `Top ${w.entities?.length ?? 0} emotionally-weighted entity(ies).` },
              ],
              details: w,
            };
          }
          case "spikes": {
            const s = await deps.client.mindsenseSpikes(days, limit);
            return {
              content: [
                { type: "text" as const, text: `${s.spikes?.length ?? 0} spike(s) in the last ${days} day(s).` },
              ],
              details: s,
            };
          }
          case "acknowledge": {
            if (!params.signal_id) {
              return {
                content: [{ type: "text" as const, text: "'signal_id' is required for acknowledge." }],
                details: { error: "missing_signal_id" },
              };
            }
            await deps.client.mindsenseAcknowledge(params.signal_id);
            return {
              content: [{ type: "text" as const, text: `Acknowledged spike ${params.signal_id}.` }],
              details: { signal_id: params.signal_id, status: "acknowledged" },
            };
          }
          case "summary": {
            const s = await deps.client.mindsenseSummary(days);
            return {
              content: [{ type: "text" as const, text: s.summary }],
              details: s,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_sense failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
