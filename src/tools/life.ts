/**
 * mind_life — Goals, projects, tasks, and calendar events.
 *
 * Full canonical action surface (matches MCP server v0.12.x). Includes
 * calendar management + stats + move/update/get. Keeps the plugin-native
 * "clear" extension that wipes the board.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const LifeParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("create"),
      Type.Literal("update"),
      Type.Literal("complete"),
      Type.Literal("delete"),
      Type.Literal("bulk_delete"),
      Type.Literal("move"),
      Type.Literal("get"),
      Type.Literal("calendar_list"),
      Type.Literal("calendar_create"),
      Type.Literal("calendar_update"),
      Type.Literal("calendar_delete"),
      Type.Literal("stats"),
      Type.Literal("clear"),
    ],
    { description: "What to do." },
  ),
  title: Type.Optional(Type.String({ description: "Title — required for create / calendar_create." })),
  description: Type.Optional(Type.String()),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("task"), Type.Literal("goal"), Type.Literal("project")],
      { description: "Life item type. Default: 'task'." },
    ),
  ),
  priority: Type.Optional(
    Type.Union(
      [Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("urgent")],
      { description: "Priority. Default: 'medium'." },
    ),
  ),
  due_date: Type.Optional(Type.String({ description: "Due date YYYY-MM-DD." })),
  status: Type.Optional(
    Type.String({
      description:
        "Filter for list, or new status for update/move (todo, in_progress, blocked, done, action, someday, waiting, completed, all).",
    }),
  ),
  color: Type.Optional(
    Type.Union(
      [
        Type.Literal("default"),
        Type.Literal("red"),
        Type.Literal("orange"),
        Type.Literal("yellow"),
        Type.Literal("green"),
        Type.Literal("blue"),
        Type.Literal("purple"),
        Type.Literal("pink"),
      ],
      { description: "Card stripe color." },
    ),
  ),
  target_date: Type.Optional(Type.String({ description: "Target completion date YYYY-MM-DD." })),
  tags: Type.Optional(Type.Array(Type.String(), { description: "Tags (REPLACES existing on update)." })),
  limit: Type.Optional(Type.Number({ description: "Max results for list. Default: 30." })),
  item_id: Type.Optional(Type.String({ description: "Item ID for get/update/complete/delete/move." })),
  item_ids: Type.Optional(
    Type.Array(Type.String(), { description: "Item IDs for bulk_delete (1–200 in one call)." }),
  ),
  // calendar
  event_id: Type.Optional(Type.String({ description: "Event ID for calendar_update / calendar_delete." })),
  start_time: Type.Optional(Type.String({ description: "Calendar start time (ISO 8601)." })),
  end_time: Type.Optional(Type.String({ description: "Calendar end time (ISO 8601)." })),
  all_day: Type.Optional(Type.Boolean({ description: "Whether the calendar event is all-day." })),
});

type LifeParams = Static<typeof LifeParameters>;

const BULK_CHUNK = 200;

export function createMindLifeTool(deps: ToolDeps) {
  return {
    name: "mind_life",
    label: "MIND Life",
    description:
      "Manage goals, projects, tasks, and calendar events in MIND Life. Use for tracking work, creating action items, updating progress, completing tasks, managing calendar, and viewing stats. To add action-plan items INSIDE a project, use mind_tasks with parent_id set to the Life item's id. Syncs to web and mobile.",
    parameters: LifeParameters,
    async execute(_toolCallId: string, params: LifeParams) {
      try {
        switch (params.action) {
          case "create": {
            if (!params.title) return missing("title");
            const item = await deps.client.createLifeItem({
              title: params.title,
              description: params.description,
              type: params.type ?? "task",
              status: "todo",
              priority: params.priority ?? "medium",
              due_date: params.due_date,
              tags: params.tags,
              color: params.color,
              target_date: params.target_date,
            });
            return {
              content: [{ type: "text" as const, text: `Created life item "${item.title}" (id: ${item.id})` }],
              details: item,
            };
          }
          case "list": {
            const status = params.status ?? "all";
            const items = await deps.client.listLifeItems({
              status: status === "all" ? undefined : status,
              limit: params.limit ?? 30,
            });
            const list = items.items
              .map((i) => `- [${i.status}] ${i.title} (id: ${i.id})${i.due_date ? ` (due ${i.due_date})` : ""}`)
              .join("\n");
            return {
              content: [{ type: "text" as const, text: `${items.items.length} items:\n${list}` }],
              details: items,
            };
          }
          case "get": {
            if (!params.item_id) return missing("item_id");
            const item = await deps.client.getLifeItem(params.item_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${item.title}${item.description ? `\n\n${item.description}` : ""}\nStatus: ${item.status ?? "?"}${item.due_date ? `\nDue: ${item.due_date}` : ""}`,
                },
              ],
              details: item,
            };
          }
          case "update": {
            if (!params.item_id) return missing("item_id");
            const patch: Record<string, unknown> = {};
            if (params.title !== undefined) patch.title = params.title;
            if (params.description !== undefined) patch.description = params.description;
            if (params.type !== undefined) patch.type = params.type;
            if (params.priority !== undefined) patch.priority = params.priority;
            if (params.due_date !== undefined) patch.due_date = params.due_date;
            if (params.status !== undefined) patch.status = params.status;
            if (params.color !== undefined) patch.color = params.color;
            if (params.target_date !== undefined) patch.target_date = params.target_date;
            if (params.tags !== undefined) patch.tags = params.tags;
            const item = await deps.client.updateLifeItem(params.item_id, patch);
            return {
              content: [{ type: "text" as const, text: `Updated life item "${item.title}"` }],
              details: item,
            };
          }
          case "move": {
            if (!params.item_id || !params.status) return missing("item_id, status");
            const item = await deps.client.moveLifeItem(params.item_id, params.status);
            return {
              content: [{ type: "text" as const, text: `Moved item to "${item.status}"` }],
              details: item,
            };
          }
          case "complete": {
            if (!params.item_id) return missing("item_id");
            await deps.client.completeLifeItem(params.item_id);
            return {
              content: [{ type: "text" as const, text: `Completed life item ${params.item_id}` }],
              details: { id: params.item_id, status: "completed" },
            };
          }
          case "delete": {
            if (!params.item_id) return missing("item_id");
            await deps.client.deleteLifeItem(params.item_id);
            return {
              content: [{ type: "text" as const, text: `Deleted life item ${params.item_id}` }],
              details: { id: params.item_id, status: "deleted" },
            };
          }
          case "bulk_delete": {
            if (!params.item_ids || params.item_ids.length === 0) return missing("item_ids");
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
            // Plugin extension: wipe the whole board.
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
          case "calendar_list": {
            const r = await deps.client.listCalendarEvents();
            const lines = r.events.map(
              (e) => `• ${e.title}${e.start_time ? ` @ ${e.start_time}` : ""}${e.all_day ? " (all-day)" : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${r.events.length} event(s):\n${lines.join("\n")}` : "No calendar events.",
                },
              ],
              details: r,
            };
          }
          case "calendar_create": {
            if (!params.title || !params.start_time) return missing("title, start_time");
            const e = await deps.client.createCalendarEvent({
              title: params.title,
              description: params.description,
              start_time: params.start_time,
              end_time: params.end_time,
              all_day: params.all_day,
            });
            return {
              content: [{ type: "text" as const, text: `Created event "${e.title}" (id: ${e.event_id})` }],
              details: e,
            };
          }
          case "calendar_update": {
            if (!params.event_id) return missing("event_id");
            const patch: Record<string, unknown> = {};
            if (params.title !== undefined) patch.title = params.title;
            if (params.description !== undefined) patch.description = params.description;
            if (params.start_time !== undefined) patch.start_time = params.start_time;
            if (params.end_time !== undefined) patch.end_time = params.end_time;
            if (params.all_day !== undefined) patch.all_day = params.all_day;
            const e = await deps.client.updateCalendarEvent(params.event_id, patch);
            return {
              content: [{ type: "text" as const, text: `Updated event "${e.title}"` }],
              details: e,
            };
          }
          case "calendar_delete": {
            if (!params.event_id) return missing("event_id");
            await deps.client.deleteCalendarEvent(params.event_id);
            return {
              content: [{ type: "text" as const, text: `Deleted event ${params.event_id}` }],
              details: { event_id: params.event_id, status: "deleted" },
            };
          }
          case "stats": {
            const s = await deps.client.lifeStats();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Life stats: ${s.total_items} total · completion ${Math.round((s.completion_rate ?? 0) * 100)}%\nBy status: ${Object.entries(s.status_counts ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}`,
                },
              ],
              details: s,
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

function missing(fields: string) {
  return {
    content: [{ type: "text" as const, text: `Required: ${fields}` }],
    details: { error: `missing: ${fields}` },
  };
}
