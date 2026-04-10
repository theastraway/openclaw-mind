/**
 * mind_life — UNIQUE TO MIND
 *
 * Life management: tasks, goals, projects, calendar events.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const LifeParameters = Type.Object({
  action: Type.Union(
    [Type.Literal("create"), Type.Literal("list"), Type.Literal("complete")],
    { description: "What to do" },
  ),
  title: Type.Optional(Type.String({ description: "Item title (required for create)" })),
  description: Type.Optional(Type.String()),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("task"), Type.Literal("goal"), Type.Literal("project")],
      { description: "Item type. Default: 'task'" },
    ),
  ),
  priority: Type.Optional(
    Type.Union(
      [
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("urgent"),
      ],
      { description: "Priority. Default: 'medium'" },
    ),
  ),
  due_date: Type.Optional(Type.String({ description: "ISO date or datetime" })),
  status: Type.Optional(
    Type.Union(
      [
        Type.Literal("todo"),
        Type.Literal("in_progress"),
        Type.Literal("blocked"),
        Type.Literal("done"),
        Type.Literal("all"),
      ],
      { description: "Filter for list. Default: 'todo'" },
    ),
  ),
  limit: Type.Optional(Type.Number({ description: "Max results for list. Default: 20" })),
  item_id: Type.Optional(Type.String({ description: "Item ID for complete" })),
});

type LifeParams = Static<typeof LifeParameters>;

export function createMindLifeTool(deps: ToolDeps) {
  return {
    name: "mind_life",
    label: "MIND Life",
    description:
      "Manage MIND Life items (tasks, goals, projects). Use when the user mentions something to do, a deadline, a goal, or a project. Actions: 'create', 'list', 'complete'. MIND Life syncs to web and mobile apps.",
    parameters: LifeParameters,
    async execute(_toolCallId: string, params: LifeParams) {
      try {
        switch (params.action) {
          case "create": {
            if (!params.title) {
              return {
                content: [{ type: "text" as const, text: "'title' is required for action='create'" }],
                details: { error: "missing_title" },
              };
            }
            const item = await deps.client.createLifeItem({
              title: params.title,
              description: params.description,
              type: params.type ?? "task",
              status: "todo",
              priority: params.priority ?? "medium",
              due_date: params.due_date,
            });
            return {
              content: [{ type: "text" as const, text: `Created life item "${item.title}" (id: ${item.id})` }],
              details: item,
            };
          }
          case "list": {
            const status = params.status ?? "todo";
            const items = await deps.client.listLifeItems({
              status: status === "all" ? undefined : status,
              limit: params.limit ?? 20,
            });
            const list = items.items
              .map((i) => `- [${i.status}] ${i.title} ${i.due_date ? `(due ${i.due_date})` : ""}`)
              .join("\n");
            return {
              content: [{ type: "text" as const, text: `${items.items.length} items:\n${list}` }],
              details: items,
            };
          }
          case "complete": {
            if (!params.item_id) {
              return {
                content: [{ type: "text" as const, text: "'item_id' is required for action='complete'" }],
                details: { error: "missing_item_id" },
              };
            }
            await deps.client.completeLifeItem(params.item_id);
            return {
              content: [{ type: "text" as const, text: `Completed life item ${params.item_id}` }],
              details: { id: params.item_id, status: "completed" },
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_life failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
