/**
 * mind_notify — MIND notifications inbox.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const NotifyParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("mark_read"),
      Type.Literal("mark_all_read"),
      Type.Literal("stats"),
    ],
    { description: "Action: list, mark_read (single), mark_all_read, stats." },
  ),
  notification_id: Type.Optional(Type.String({ description: "Notification ID for mark_read." })),
  limit: Type.Optional(Type.Number({ description: "Max notifications. Default: 20." })),
});

type NotifyParams = Static<typeof NotifyParameters>;

export function createMindNotifyTool(deps: ToolDeps) {
  return {
    name: "mind_notify",
    label: "MIND Notify",
    description:
      "Read and manage MIND notifications — alerts, reminders, insight notifications, and system messages.",
    parameters: NotifyParameters,
    async execute(_toolCallId: string, params: NotifyParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listNotifications({ limit: params.limit ?? 20 });
            const lines = (r.notifications ?? []).map(
              (n) => `${n.read ? "  " : "● "}${n.title ?? "(no title)"} — ${n.message ?? ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length
                    ? `${r.total} notification(s), ${r.unread} unread:\n${lines.join("\n")}`
                    : "No notifications.",
                },
              ],
              details: r,
            };
          }
          case "mark_read": {
            if (!params.notification_id) {
              return {
                content: [{ type: "text" as const, text: "'notification_id' is required." }],
                details: { error: "missing_id" },
              };
            }
            await deps.client.markNotificationRead(params.notification_id);
            return { content: [{ type: "text" as const, text: "Marked read." }], details: { ok: true } };
          }
          case "mark_all_read": {
            const r = await deps.client.markAllNotificationsRead();
            return {
              content: [{ type: "text" as const, text: `Marked ${r.count} notification(s) read.` }],
              details: r,
            };
          }
          case "stats": {
            const r = await deps.client.notificationStats();
            return {
              content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_notify failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
