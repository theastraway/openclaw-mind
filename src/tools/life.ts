/**
 * mind_life — UNIQUE TO MIND
 *
 * Life management: tasks, goals, projects, calendar events.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const LifeParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("create"),
      Type.Literal("list"),
      Type.Literal("complete"),
      Type.Literal("delete"),
      Type.Literal("bulk_delete"),
      Type.Literal("clear"),
    ],
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
  item_id: Type.Optional(Type.String({ description: "Item ID for complete or delete" })),
  item_ids: Type.Optional(
    Type.Array(Type.String(), {
      description: "Item IDs to remove in one call for bulk_delete (up to 200)",
    }),
  ),
});

type LifeParams = Static<typeof LifeParameters>;

const BULK_CHUNK = 200;

export function createMindLifeTool(deps: ToolDeps) {
  return {
    name: "mind_life",
    label: "MIND Life",
    description:
      "Manage MIND Life items — the top-level board entries: goals and projects. Use when the user mentions a goal, a project, or something to track. Actions: 'create', 'list', 'complete', 'delete' (one item by item_id), 'bulk_delete' (many at once via item_ids), 'clear' (delete EVERY item on the board — use when the user says clear/empty/delete all). To add action-plan items (tasks) INSIDE a project, use the `mind_tasks` tool with parent_id set to the Life item's id. MIND Life syncs to web and mobile apps.",
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
            // Default to no status filter — the MIND life board uses stage
            // names (thoughts/ready/action/active), so a "todo" filter would
            // hide everything.
            const status = params.status ?? "all";
            const items = await deps.client.listLifeItems({
              status: status === "all" ? undefined : status,
              limit: params.limit ?? 20,
            });
            const list = items.items
              .map((i) => `- [${i.status}] ${i.title} (id: ${i.id})${i.due_date ? ` (due ${i.due_date})` : ""}`)
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
          case "delete": {
            if (!params.item_id) {
              return {
                content: [{ type: "text" as const, text: "'item_id' is required for action='delete'" }],
                details: { error: "missing_item_id" },
              };
            }
            await deps.client.deleteLifeItem(params.item_id);
            return {
              content: [{ type: "text" as const, text: `Deleted life item ${params.item_id}` }],
              details: { id: params.item_id, status: "deleted" },
            };
          }
          case "bulk_delete": {
            if (!params.item_ids || params.item_ids.length === 0) {
              return {
                content: [
                  { type: "text" as const, text: "'item_ids' (a non-empty array) is required for action='bulk_delete'" },
                ],
                details: { error: "missing_item_ids" },
              };
            }
            let deleted = 0;
            const notFound: string[] = [];
            for (let i = 0; i < params.item_ids.length; i += BULK_CHUNK) {
              const chunk = params.item_ids.slice(i, i + BULK_CHUNK);
              const res = await deps.client.bulkDeleteLifeItems(chunk);
              deleted += res.deleted_count;
              notFound.push(...res.not_found);
            }
            const note = notFound.length ? ` (${notFound.length} id(s) not found, skipped)` : "";
            return {
              content: [{ type: "text" as const, text: `Deleted ${deleted} life item(s)${note}` }],
              details: { deleted_count: deleted, not_found: notFound },
            };
          }
          case "clear": {
            // Delete EVERY item on the board. The list API returns up to 100
            // per call with no offset, so list-then-delete in waves until empty.
            let deleted = 0;
            let rounds = 0;
            for (;;) {
              if (rounds++ > 100) {
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: `Cleared ${deleted} item(s), then stopped after 100 rounds — run 'clear' again to finish.`,
                    },
                  ],
                  details: { deleted_count: deleted, incomplete: true },
                };
              }
              const page = await deps.client.listLifeItems({ limit: 100 });
              const ids = page.items.map((i) => i.id).filter(Boolean);
              if (ids.length === 0) break;
              for (let i = 0; i < ids.length; i += BULK_CHUNK) {
                const res = await deps.client.bulkDeleteLifeItems(ids.slice(i, i + BULK_CHUNK));
                deleted += res.deleted_count;
              }
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    deleted === 0
                      ? "Life board is already empty — nothing to clear."
                      : `Cleared the life board — deleted ${deleted} item(s).`,
                },
              ],
              details: { deleted_count: deleted, cleared: true },
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
