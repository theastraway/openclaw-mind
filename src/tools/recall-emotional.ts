/**
 * mind_recall_emotional — UNIQUE TO MIND (patent-pending)
 *
 * Emotionally weighted memory recall using MINDsense valence + arousal scores.
 * No other memory tool does this.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const RecallEmotionalParameters = Type.Object({
  query: Type.String({
    description: "What to search for, biased toward emotionally salient memories.",
  }),
  emotion_filter: Type.Optional(
    Type.Union(
      [
        Type.Literal("positive"),
        Type.Literal("negative"),
        Type.Literal("high_arousal"),
        Type.Literal("low_arousal"),
        Type.Literal("triumph"),
        Type.Literal("warning"),
        Type.Literal("any"),
      ],
      {
        description:
          "Filter by emotional category. 'positive'=high valence. 'negative'=low valence. 'high_arousal'=intense moments. 'triumph' / 'warning' = MINDsense semantic categories.",
      },
    ),
  ),
  min_intensity: Type.Optional(
    Type.Number({
      description: "Minimum emotional intensity (0-1). Default: 0.3",
      minimum: 0,
      maximum: 1,
    }),
  ),
  top_k: Type.Optional(
    Type.Number({ description: "Maximum results. Default: 10", minimum: 1, maximum: 50 }),
  ),
});

type RecallEmotionalParams = Static<typeof RecallEmotionalParameters>;

export function createMindRecallEmotionalTool(deps: ToolDeps) {
  return {
    name: "mind_recall_emotional",
    label: "MIND Emotional Recall",
    description:
      "Recall memories weighted by emotional significance (MINDsense, patent-pending). Use when the agent needs to understand the user's strong feelings, important moments, frustrations, wins, or warnings. Example queries: 'what frustrates the user about deployment', 'what wins did the user celebrate this month'.",
    parameters: RecallEmotionalParameters,
    async execute(_toolCallId: string, params: RecallEmotionalParams) {
      try {
        const emotionTag = params.emotion_filter ?? "any";
        const intensityHint = params.min_intensity ?? 0.3;
        const augmentedQuery = `${params.query}\n\n[Emotional context: ${emotionTag}, min_intensity=${intensityHint}]`;

        const result = await deps.client.query({
          query: augmentedQuery,
          mode: "hybrid",
          top_k: params.top_k ?? 10,
        });

        return {
          content: [{ type: "text" as const, text: result.answer }],
          details: {
            answer: result.answer,
            sources: result.sources ?? [],
            emotion_filter: emotionTag,
            min_intensity: intensityHint,
          },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_recall_emotional failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
