/**
 * mind_crm — Manage contacts and relationships in MIND CRM.
 *
 * Umbrella replacement for the legacy mind_crm_log tool. Matches canonical
 * MCP-server actions: list, create, update, delete, get, log_activity,
 * list_activities.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const CrmParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("create"),
      Type.Literal("update"),
      Type.Literal("delete"),
      Type.Literal("get"),
      Type.Literal("log_activity"),
      Type.Literal("list_activities"),
    ],
    {
      description:
        "Action: list/create/update/delete/get contacts; log_activity (call/email/meeting/note); list_activities (history).",
    },
  ),
  contact_id: Type.Optional(
    Type.String({
      description: "Contact ID — required for update/delete/get/log_activity/list_activities.",
    }),
  ),
  name: Type.Optional(Type.String({ description: "Contact name — required for create." })),
  email: Type.Optional(Type.String()),
  company: Type.Optional(Type.String()),
  type: Type.Optional(
    Type.String({ description: "Contact type: lead, prospect, partner, customer, personal." }),
  ),
  stage: Type.Optional(
    Type.String({ description: "Pipeline stage: new, qualified, proposal, closed, lost." }),
  ),
  source: Type.Optional(Type.String({ description: "How you found them." })),
  notes: Type.Optional(Type.String()),
  activity_type: Type.Optional(
    Type.String({ description: "Activity type for log_activity: call, email, meeting, note." }),
  ),
  activity_notes: Type.Optional(
    Type.String({ description: "Description / notes for the activity being logged." }),
  ),
  limit: Type.Optional(Type.Number({ description: "Max contacts for list. Default: 30." })),
});

type CrmParams = Static<typeof CrmParameters>;

export function createMindCrmTool(deps: ToolDeps) {
  return {
    name: "mind_crm",
    label: "MIND CRM",
    description:
      "Manage contacts and relationships in MIND CRM. Use for tracking people, companies, leads, interaction history, and activity logging. Always log calls/emails/meetings here so the relationship history persists across sessions.",
    parameters: CrmParameters,
    async execute(_toolCallId: string, params: CrmParams) {
      try {
        switch (params.action) {
          case "list": {
            const res = await deps.client.listCrmContacts({ limit: params.limit ?? 30 });
            const lines = (res.contacts ?? []).map(
              (c) =>
                `• ${c.name}${c.email ? ` <${c.email}>` : ""}${c.company ? ` · ${c.company}` : ""}${c.stage ? ` · ${c.stage}` : ""} — id: ${c.contact_id ?? c.id}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${lines.length} contact(s):\n${lines.join("\n")}` : "No contacts yet.",
                },
              ],
              details: res,
            };
          }
          case "create": {
            if (!params.name) {
              return {
                content: [{ type: "text" as const, text: "'name' is required for create." }],
                details: { error: "missing_name" },
              };
            }
            const c = await deps.client.createCrmContact({
              name: params.name,
              email: params.email,
              company: params.company,
              type: params.type,
              stage: params.stage,
              source: params.source,
              notes: params.notes,
            });
            return {
              content: [
                { type: "text" as const, text: `Created contact "${c.name}" (id: ${c.contact_id ?? c.id})` },
              ],
              details: c,
            };
          }
          case "update": {
            if (!params.contact_id) {
              return {
                content: [{ type: "text" as const, text: "'contact_id' is required for update." }],
                details: { error: "missing_contact_id" },
              };
            }
            const patch: Record<string, unknown> = {};
            if (params.name !== undefined) patch.name = params.name;
            if (params.email !== undefined) patch.email = params.email;
            if (params.company !== undefined) patch.company = params.company;
            if (params.type !== undefined) patch.type = params.type;
            if (params.stage !== undefined) patch.stage = params.stage;
            if (params.source !== undefined) patch.source = params.source;
            if (params.notes !== undefined) patch.notes = params.notes;
            const c = await deps.client.updateCrmContact(params.contact_id, patch);
            return {
              content: [{ type: "text" as const, text: `Updated contact "${c.name}"` }],
              details: c,
            };
          }
          case "delete": {
            if (!params.contact_id) {
              return {
                content: [{ type: "text" as const, text: "'contact_id' is required for delete." }],
                details: { error: "missing_contact_id" },
              };
            }
            await deps.client.deleteCrmContact(params.contact_id);
            return {
              content: [{ type: "text" as const, text: `Deleted contact ${params.contact_id}` }],
              details: { id: params.contact_id, status: "deleted" },
            };
          }
          case "get": {
            if (!params.contact_id) {
              return {
                content: [{ type: "text" as const, text: "'contact_id' is required for get." }],
                details: { error: "missing_contact_id" },
              };
            }
            const c = await deps.client.getCrmContact(params.contact_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${c.name}${c.email ? ` <${c.email}>` : ""}${c.company ? `\n${c.company}` : ""}${c.stage ? `\nstage: ${c.stage}` : ""}${c.notes ? `\n\n${c.notes}` : ""}`,
                },
              ],
              details: c,
            };
          }
          case "log_activity": {
            if (!params.contact_id) {
              return {
                content: [{ type: "text" as const, text: "'contact_id' is required for log_activity." }],
                details: { error: "missing_contact_id" },
              };
            }
            const activityType = params.activity_type ?? "note";
            const title = params.activity_notes?.slice(0, 80) ?? `Logged ${activityType}`;
            const res = await deps.client.logCrmActivity(params.contact_id, {
              type: activityType,
              title,
              description: params.activity_notes,
            });
            return {
              content: [{ type: "text" as const, text: `Logged ${activityType} on contact (id: ${res.activity_id})` }],
              details: res,
            };
          }
          case "list_activities": {
            if (!params.contact_id) {
              return {
                content: [{ type: "text" as const, text: "'contact_id' is required for list_activities." }],
                details: { error: "missing_contact_id" },
              };
            }
            const res = await deps.client.listCrmActivities(params.contact_id);
            const lines = (res.activities ?? []).map(
              (a) => `• ${a.type} — ${a.title ?? "(no title)"}${a.created_at ? ` (${a.created_at})` : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${lines.length} activity(ies):\n${lines.join("\n")}` : "No activities yet.",
                },
              ],
              details: res,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_crm failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
