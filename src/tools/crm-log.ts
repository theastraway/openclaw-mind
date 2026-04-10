/**
 * mind_crm_log — UNIQUE TO MIND
 *
 * CRM activity logging.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const CrmLogParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("create_contact"),
      Type.Literal("list_contacts"),
      Type.Literal("log_activity"),
    ],
    { description: "What to do" },
  ),
  name: Type.Optional(Type.String({ description: "Contact name (required for create_contact)" })),
  email: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
  company: Type.Optional(Type.String()),
  type: Type.Optional(Type.String({ description: "Relationship type: investor, partner, customer" })),
  stage: Type.Optional(Type.String({ description: "Pipeline stage" })),
  notes: Type.Optional(Type.String()),
  contact_id: Type.Optional(Type.String({ description: "Contact ID for log_activity" })),
  activity_type: Type.Optional(
    Type.Union(
      [
        Type.Literal("call"),
        Type.Literal("email"),
        Type.Literal("meeting"),
        Type.Literal("note"),
        Type.Literal("other"),
      ],
      { description: "Activity type" },
    ),
  ),
  summary: Type.Optional(Type.String({ description: "What happened" })),
  occurred_at: Type.Optional(Type.String({ description: "ISO datetime" })),
  limit: Type.Optional(Type.Number({ description: "Max contacts to list" })),
});

type CrmLogParams = Static<typeof CrmLogParameters>;

export function createMindCrmLogTool(deps: ToolDeps) {
  return {
    name: "mind_crm_log",
    label: "MIND CRM",
    description:
      "Manage MIND CRM contacts and log interactions. Use when the user mentions a person they're working with, a meeting, an email, or a relationship. Actions: 'create_contact', 'list_contacts', 'log_activity'.",
    parameters: CrmLogParameters,
    async execute(_toolCallId: string, params: CrmLogParams) {
      try {
        switch (params.action) {
          case "create_contact": {
            if (!params.name) {
              return {
                content: [{ type: "text" as const, text: "'name' is required for create_contact" }],
                details: { error: "missing_name" },
              };
            }
            const contact = await deps.client.createCrmContact({
              name: params.name,
              email: params.email,
              phone: params.phone,
              company: params.company,
              type: params.type,
              stage: params.stage,
              notes: params.notes,
            });
            return {
              content: [{ type: "text" as const, text: `Created contact ${contact.name} (id: ${contact.id})` }],
              details: contact,
            };
          }
          case "list_contacts": {
            const contacts = await deps.client.listCrmContacts({ limit: params.limit ?? 20 });
            const list = contacts.contacts.map((c) => `- ${c.name} ${c.company ? `(${c.company})` : ""}`).join("\n");
            return {
              content: [{ type: "text" as const, text: `${contacts.contacts.length} contacts:\n${list}` }],
              details: contacts,
            };
          }
          case "log_activity": {
            if (!params.contact_id || !params.activity_type || !params.summary) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "'contact_id', 'activity_type', and 'summary' are required for log_activity",
                  },
                ],
                details: { error: "missing_required" },
              };
            }
            await deps.client.logCrmActivity(params.contact_id, {
              type: params.activity_type,
              summary: params.summary,
              occurred_at: params.occurred_at,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Logged ${params.activity_type} activity for contact ${params.contact_id}`,
                },
              ],
              details: { contact_id: params.contact_id, activity_type: params.activity_type },
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_crm_log failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
