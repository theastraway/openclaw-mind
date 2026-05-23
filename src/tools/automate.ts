/**
 * mind_automate — Scheduled automations + CRM event triggers.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const AutomateParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("create"),
      Type.Literal("update"),
      Type.Literal("delete"),
      Type.Literal("run_now"),
      Type.Literal("history"),
    ],
    { description: "Action: list/create/update/delete automations, run_now, history (execution log)." },
  ),
  automation_id: Type.Optional(Type.String({ description: "Automation ID — update/delete/run_now/history." })),
  name: Type.Optional(Type.String({ description: "Automation name for create/update." })),
  trigger_type: Type.Optional(Type.String({ description: "Trigger type: schedule, webhook, event." })),
  trigger_config: Type.Optional(Type.String({ description: "JSON config for trigger (e.g. cron expression)." })),
  action_type: Type.Optional(Type.String({ description: "Action to execute on trigger." })),
  action_config: Type.Optional(Type.String({ description: "JSON config for the action." })),
  enabled: Type.Optional(Type.Boolean({ description: "Whether the automation is enabled." })),
});

type AutomateParams = Static<typeof AutomateParameters>;

function parseJson(s?: string): Record<string, unknown> | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function createMindAutomateTool(deps: ToolDeps) {
  return {
    name: "mind_automate",
    label: "MIND Automate",
    description:
      "Create and manage automations in MIND — scheduled workflows, event triggers, and rules that run automatically. Connect CRM events to actions, schedule recurring tasks, build custom pipelines.",
    parameters: AutomateParameters,
    async execute(_toolCallId: string, params: AutomateParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listAutomations();
            const lines = (r.automations ?? []).map(
              (a) => `• ${a.enabled ? "✓" : "✗"} ${a.task} — every ${a.interval}${a.last_run_at ? ` (last: ${a.last_run_at})` : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${r.total} automation(s):\n${lines.join("\n")}` : "No automations.",
                },
              ],
              details: r,
            };
          }
          case "create": {
            const payload: Record<string, unknown> = {
              name: params.name,
              trigger_type: params.trigger_type,
              trigger_config: parseJson(params.trigger_config) ?? params.trigger_config,
              action_type: params.action_type,
              action_config: parseJson(params.action_config) ?? params.action_config,
              enabled: params.enabled ?? true,
            };
            const r = await deps.client.createAutomation(payload);
            return {
              content: [{ type: "text" as const, text: `Automation created (id: ${(r.id as string) ?? "?"})` }],
              details: r,
            };
          }
          case "update": {
            if (!params.automation_id) {
              return {
                content: [{ type: "text" as const, text: "'automation_id' is required." }],
                details: { error: "missing_id" },
              };
            }
            const patch: Record<string, unknown> = {};
            if (params.name !== undefined) patch.name = params.name;
            if (params.trigger_config !== undefined)
              patch.trigger_config = parseJson(params.trigger_config) ?? params.trigger_config;
            if (params.action_config !== undefined)
              patch.action_config = parseJson(params.action_config) ?? params.action_config;
            if (params.enabled !== undefined) patch.enabled = params.enabled;
            const r = await deps.client.updateAutomation(params.automation_id, patch);
            return { content: [{ type: "text" as const, text: "Automation updated." }], details: r };
          }
          case "delete": {
            if (!params.automation_id) {
              return {
                content: [{ type: "text" as const, text: "'automation_id' is required." }],
                details: { error: "missing_id" },
              };
            }
            await deps.client.deleteAutomation(params.automation_id);
            return {
              content: [{ type: "text" as const, text: `Deleted automation ${params.automation_id}` }],
              details: { ok: true },
            };
          }
          case "run_now": {
            if (!params.automation_id) {
              return {
                content: [{ type: "text" as const, text: "'automation_id' is required." }],
                details: { error: "missing_id" },
              };
            }
            const r = await deps.client.runAutomationNow(params.automation_id);
            return { content: [{ type: "text" as const, text: "Triggered." }], details: r };
          }
          case "history": {
            if (!params.automation_id) {
              return {
                content: [{ type: "text" as const, text: "'automation_id' is required." }],
                details: { error: "missing_id" },
              };
            }
            const r = await deps.client.automationHistory(params.automation_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.executions?.length ?? 0} execution(s):\n${JSON.stringify(r.executions, null, 2)}`,
                },
              ],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_automate failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
