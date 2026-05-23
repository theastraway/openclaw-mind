/**
 * mind_tickets — Agent ticket queue (admin-only).
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const TicketsParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("get"),
      Type.Literal("create"),
      Type.Literal("comment"),
      Type.Literal("update"),
      Type.Literal("resolve"),
      Type.Literal("delete"),
    ],
    { description: "Ticket action." },
  ),
  agent_slug: Type.String({ description: "Slug of the agent the ticket lives on — REQUIRED for every action." }),
  ticket_id: Type.Optional(Type.String({ description: "Ticket ID — required for get/comment/update/resolve/delete." })),
  title: Type.Optional(Type.String({ description: "Ticket title — required for create." })),
  body: Type.Optional(Type.String({ description: "Ticket body (create) or comment text (comment)." })),
  kind: Type.Optional(
    Type.Union(
      [
        Type.Literal("feedback"),
        Type.Literal("critique"),
        Type.Literal("idea"),
        Type.Literal("feature"),
        Type.Literal("bug"),
      ],
      { description: "Ticket kind. Default: feedback." },
    ),
  ),
  priority: Type.Optional(
    Type.Union(
      [Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("urgent")],
      { description: "Ticket priority. Default: medium." },
    ),
  ),
  status: Type.Optional(
    Type.Union(
      [
        Type.Literal("open"),
        Type.Literal("triaged"),
        Type.Literal("in_progress"),
        Type.Literal("resolved"),
        Type.Literal("closed"),
      ],
      { description: "Status for update, or filter for list." },
    ),
  ),
  assignee: Type.Optional(Type.String({ description: "Reassign to agent slug or username." })),
});

type TicketsParams = Static<typeof TicketsParameters>;

export function createMindTicketsTool(deps: ToolDeps) {
  return {
    name: "mind_tickets",
    label: "MIND Tickets",
    description:
      "Agent ticket queue — file, view, answer, triage, and resolve tickets on any agent in the Command Center. A ticket is client feedback / critique / an idea / a feature request / a bug. Every ticket lives on an agent (agent_slug is always required) and auto-assigns to the Ernie triage agent. Backed by /admin/agents/{slug}/tickets; admin API key required.",
    parameters: TicketsParameters,
    async execute(_toolCallId: string, params: TicketsParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listAgentTickets(params.agent_slug, params.status);
            const lines = r.tickets.map(
              (t) =>
                `• [${t.status}/${t.priority}] ${t.kind} — ${t.title} (id: ${t.ticket_id})`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.stats.total} ticket(s) on ${r.slug}, ${r.stats.open} open:\n${lines.join("\n")}`,
                },
              ],
              details: r,
            };
          }
          case "get": {
            if (!params.ticket_id) return missing("ticket_id");
            const t = await deps.client.getAgentTicket(params.agent_slug, params.ticket_id);
            const comments = (t.comments ?? [])
              .map((c) => `  [${c.created_at}] ${c.author}: ${c.body}`)
              .join("\n");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `[${t.status}/${t.priority}] ${t.kind}\n${t.title}\n\n${t.body}\n\nComments:\n${comments || "(none)"}`,
                },
              ],
              details: t,
            };
          }
          case "create": {
            if (!params.title) return missing("title");
            const t = await deps.client.createAgentTicket(params.agent_slug, {
              kind: params.kind ?? "feedback",
              title: params.title,
              body: params.body,
              priority: params.priority ?? "medium",
            });
            return {
              content: [
                { type: "text" as const, text: `Created ticket ${t.ticket_id} on ${t.agent_slug}` },
              ],
              details: t,
            };
          }
          case "comment": {
            if (!params.ticket_id || !params.body) return missing("ticket_id, body");
            const c = await deps.client.commentAgentTicket(params.agent_slug, params.ticket_id, params.body);
            return {
              content: [{ type: "text" as const, text: `Comment posted on ticket ${c.ticket_id}` }],
              details: c,
            };
          }
          case "update": {
            if (!params.ticket_id) return missing("ticket_id");
            const patch: Record<string, unknown> = {};
            if (params.status) patch.status = params.status;
            if (params.priority) patch.priority = params.priority;
            if (params.kind) patch.kind = params.kind;
            if (params.assignee !== undefined) patch.assignee = params.assignee;
            const t = await deps.client.updateAgentTicket(params.agent_slug, params.ticket_id, patch);
            return {
              content: [{ type: "text" as const, text: `Updated ticket ${t.ticket_id} (status: ${t.status})` }],
              details: t,
            };
          }
          case "resolve": {
            if (!params.ticket_id) return missing("ticket_id");
            const t = await deps.client.updateAgentTicket(params.agent_slug, params.ticket_id, {
              status: "resolved",
            });
            return {
              content: [{ type: "text" as const, text: `Resolved ticket ${t.ticket_id}` }],
              details: t,
            };
          }
          case "delete": {
            if (!params.ticket_id) return missing("ticket_id");
            const r = await deps.client.deleteAgentTicket(params.agent_slug, params.ticket_id);
            return {
              content: [{ type: "text" as const, text: `Deleted ticket ${r.deleted}` }],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_tickets failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}

function missing(fields: string) {
  return {
    content: [{ type: "text" as const, text: `Required: ${fields}` }],
    details: { error: `missing: ${fields}` },
  };
}
