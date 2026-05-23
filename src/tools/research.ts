/**
 * mind_research — Deep-research agent jobs.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const ResearchParameters = Type.Object({
  action: Type.Union(
    [Type.Literal("start"), Type.Literal("status"), Type.Literal("list")],
    { description: "Action: start (launch), status (check progress), list (view all jobs)." },
  ),
  topic: Type.Optional(Type.String({ description: "Research topic/question — required for start." })),
  job_id: Type.Optional(Type.String({ description: "Job ID — required for status." })),
  limit: Type.Optional(Type.Number({ description: "Max jobs to return for list. Default: 10." })),
});

type ResearchParams = Static<typeof ResearchParameters>;

export function createMindResearchTool(deps: ToolDeps) {
  return {
    name: "mind_research",
    label: "MIND Research",
    description:
      "Launch and manage deep research jobs. Research runs autonomously — it gathers information, analyzes it, and stores findings in the knowledge graph. Use for competitive analysis, market research, technical deep-dives.",
    parameters: ResearchParameters,
    async execute(_toolCallId: string, params: ResearchParams) {
      try {
        switch (params.action) {
          case "start": {
            if (!params.topic) {
              return {
                content: [{ type: "text" as const, text: "'topic' is required for start." }],
                details: { error: "missing_topic" },
              };
            }
            const job = await deps.client.startResearch(params.topic);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Research job started — id: ${job.job_id}, status: ${job.status}`,
                },
              ],
              details: job,
            };
          }
          case "status": {
            if (!params.job_id) {
              return {
                content: [{ type: "text" as const, text: "'job_id' is required for status." }],
                details: { error: "missing_job_id" },
              };
            }
            const job = await deps.client.getResearch(params.job_id);
            const summary = job.research_summary ? `\n\n${job.research_summary.slice(0, 800)}…` : "";
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${job.topic ?? job.title ?? "(no topic)"} — status: ${job.status}, papers: ${job.papers_count ?? 0}${summary}`,
                },
              ],
              details: job,
            };
          }
          case "list": {
            const r = await deps.client.listResearch(params.limit ?? 10);
            const lines = (r.jobs ?? []).map(
              (j) => `• [${j.status}] ${j.topic ?? j.title ?? "(no topic)"} — id: ${j.job_id}`,
            );
            return {
              content: [
                { type: "text" as const, text: lines.length ? `${r.total} job(s):\n${lines.join("\n")}` : "No research jobs." },
              ],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_research failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
