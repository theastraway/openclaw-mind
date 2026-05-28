/**
 * mind_folder_routes — deterministic per-source_type system-folder routing.
 *
 * System-generated docs (life items, CRM contacts/activities, chat saves,
 * tasks, training, reasoning trajectories, playbooks, trader signals,
 * cloud imports) carry a known ``source_type``. This tool lets agents
 * configure once "file all life_item writes here, all crm writes there,"
 * and every subsequent write follows the rule automatically.
 *
 * User uploads are unaffected — this is system writes only. Deterministic
 * by type; the LLM cousin (mind_folder_suggest) handles content-aware
 * picks for arbitrary uploads.
 *
 * Actions: list, set, clear, apply_recommended.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const FolderRoutesParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("set"),
      Type.Literal("clear"),
      Type.Literal("apply_recommended"),
    ],
    {
      description:
        "list (current routing table + every supported source_type with label/description), set (route one source_type to a folder), clear (remove a route — that source_type goes to the top level again), apply_recommended (create Life/CRM/Chats/Reasoning/Trader folders if missing and wire all routes; idempotent and safe to re-run).",
    },
  ),
  source_type: Type.Optional(
    Type.String({
      description:
        "Required for set and clear. Canonical values: life_item, task, crm, chat, training, trajectory, playbook, trader, document. Custom values accepted (the route fires whenever save_document_record is called with that source_type).",
    }),
  ),
  folder_id: Type.Optional(
    Type.String({
      description: "Required for set — the folder id to route this source_type into.",
    }),
  ),
});

type FolderRoutesParams = Static<typeof FolderRoutesParameters>;

export function createMindFolderRoutesTool(deps: ToolDeps) {
  return {
    name: "mind_folder_routes",
    label: "MIND Folder Routes",
    description:
      "Configure deterministic system-folder routing — which folder each kind of system-generated doc (life items, CRM, chat saves, tasks, training, reasoning trajectories, playbooks, trader signals, cloud imports) is filed into automatically. Use apply_recommended for one-tap setup that creates Life/CRM/Chats/Reasoning/Trader folders and wires every source_type to its destination. User uploads are unaffected — this is system writes only.",
    parameters: FolderRoutesParameters,
    async execute(_toolCallId: string, params: FolderRoutesParams) {
      try {
        switch (params.action) {
          case "list": {
            const [routes, folders] = await Promise.all([
              deps.client.listFolderRoutes(),
              deps.client.listFolders(),
            ]);
            const folderById = new Map(folders.folders.map((f) => [f.id, f]));
            const lines = routes.categories.map((cat) => {
              const fid = routes.routes[cat.source_type];
              const folder = fid ? folderById.get(fid) : null;
              const dest = folder
                ? `→ ${folder.name} (id: ${fid})`
                : "→ (unrouted — files at top level)";
              return `• ${cat.label} [${cat.source_type}] ${dest}\n  ${cat.description}`;
            });
            const configured = Object.keys(routes.routes).length;
            return {
              content: [
                {
                  type: "text" as const,
                  text: [
                    `${configured}/${routes.categories.length} routes configured.`,
                    "",
                    ...lines,
                  ].join("\n"),
                },
              ],
              details: routes,
            };
          }
          case "set": {
            if (!params.source_type) throw new Error("'source_type' is required");
            if (!params.folder_id) throw new Error("'folder_id' is required for set");
            const res = await deps.client.setFolderRoute(params.source_type, params.folder_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Routed source_type "${params.source_type}" → folder ${params.folder_id}. Future writes of that type will file there automatically.`,
                },
              ],
              details: res,
            };
          }
          case "clear": {
            if (!params.source_type) throw new Error("'source_type' is required");
            const res = await deps.client.clearFolderRoute(params.source_type);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Cleared route for "${params.source_type}". Future writes of that type land at the top level.`,
                },
              ],
              details: res,
            };
          }
          case "apply_recommended": {
            const res = await deps.client.applyRecommendedFolders();
            const lines: string[] = [];
            if (res.created.length) lines.push(`Created: ${res.created.join(", ")}`);
            if (res.reused.length) lines.push(`Reused: ${res.reused.join(", ")}`);
            if (res.hint_updated.length)
              lines.push(`Hints filled: ${res.hint_updated.join(", ")}`);
            lines.push("");
            lines.push(`${res.routes_set.length} routes set:`);
            for (const r of res.routes_set) {
              lines.push(`  • ${r.source_type} → ${r.folder_name}`);
            }
            return {
              content: [{ type: "text" as const, text: lines.join("\n") }],
              details: res,
            };
          }
          default:
            throw new Error(`Unknown action: ${String(params.action)}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_folder_routes failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
