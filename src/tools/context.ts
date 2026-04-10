/**
 * mind_context — UNIQUE TO MIND
 *
 * Loads structured persistent context (soul, user, rules, priorities, recent).
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const ContextParameters = Type.Object({
  sections: Type.Optional(
    Type.Array(
      Type.Union([
        Type.Literal("soul"),
        Type.Literal("user"),
        Type.Literal("rules"),
        Type.Literal("priorities"),
        Type.Literal("recent"),
      ]),
      {
        description:
          "Which context sections to load. Default: all 5. 'soul'=identity. 'user'=preferences. 'rules'=constraints. 'priorities'=current goals. 'recent'=last 7 days.",
      },
    ),
  ),
});

type ContextParams = Static<typeof ContextParameters>;

const SECTION_QUERIES: Record<string, string> = {
  soul: "user identity mission personality core values",
  user: "user preferences role responsibilities personal details",
  rules: "operating rules constraints guardrails behavioral preferences",
  priorities: "current priorities goals deadlines active projects this quarter",
  recent: "recent activity last 7 days outcomes decisions",
};

export function createMindContextTool(deps: ToolDeps) {
  return {
    name: "mind_context",
    label: "MIND Context",
    description:
      "Load structured persistent context at session start. Returns 5 sections: soul, user, rules, priorities, recent. Call FIRST in any session to ground the agent in who the user is and what matters now.",
    parameters: ContextParameters,
    async execute(_toolCallId: string, params: ContextParams) {
      const sections = params.sections ?? ["soul", "user", "rules", "priorities", "recent"];
      const result: Record<string, unknown> = {};

      await Promise.all(
        sections.map(async (section) => {
          const queryStr = SECTION_QUERIES[section] ?? section;
          try {
            const resp = await deps.client.query({
              query: queryStr,
              mode: "hybrid",
              top_k: 8,
            });
            result[section] = {
              summary: resp.answer,
              sources: (resp.sources ?? []).slice(0, 5),
            };
          } catch (err) {
            result[section] = { error: (err as Error).message };
          }
        }),
      );

      const summary = sections
        .map((s) => {
          const sec = result[s] as { summary?: string; error?: string };
          if (sec?.error) return `## ${s.toUpperCase()}\n[Error: ${sec.error}]`;
          return `## ${s.toUpperCase()}\n${sec?.summary ?? ""}`;
        })
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text: summary }],
        details: result,
      };
    },
  };
}
