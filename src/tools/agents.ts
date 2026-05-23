/**
 * mind_agents — Admin-only Agent Command Center.
 *
 * Canonical registry of every agent across the Astra AI fleet. Requires an
 * admin-scoped MIND API key.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const AgentsParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("get"),
      Type.Literal("create"),
      Type.Literal("update"),
      Type.Literal("delete"),
      Type.Literal("heartbeat"),
      Type.Literal("probe"),
      Type.Literal("log_activity"),
      Type.Literal("list_activities"),
      Type.Literal("import_from_mind"),
      Type.Literal("seed_known"),
      Type.Literal("set_status"),
      Type.Literal("set_current_job"),
      Type.Literal("transfer_owner"),
      Type.Literal("share"),
      Type.Literal("list_shares"),
      Type.Literal("revoke_share"),
      Type.Literal("list_invoices"),
      Type.Literal("link_invoice"),
      Type.Literal("unlink_invoice"),
      Type.Literal("create_invoice"),
      Type.Literal("list_workflows"),
      Type.Literal("link_workflow"),
      Type.Literal("unlink_workflow"),
      Type.Literal("used_by"),
    ],
    { description: "Agent Command Center action." },
  ),
  slug: Type.Optional(Type.String({ description: "Agent slug (lowercase, dashes)." })),
  // create/update
  name: Type.Optional(Type.String({ description: "Display name." })),
  description: Type.Optional(Type.String({ description: "One-paragraph description." })),
  status: Type.Optional(
    Type.Union(
      [
        Type.Literal("running"),
        Type.Literal("paused"),
        Type.Literal("planned"),
        Type.Literal("archived"),
        Type.Literal("error"),
      ],
      { description: "Lifecycle status." },
    ),
  ),
  cadence: Type.Optional(
    Type.Union(
      [Type.Literal("continuous"), Type.Literal("scheduled"), Type.Literal("on-demand")],
      { description: "How the agent runs." },
    ),
  ),
  host: Type.Optional(Type.String({ description: "Host: DO1 / DO2-LEO / local / render / vercel / atlas-droplet / other." })),
  host_address: Type.Optional(Type.String({ description: "IP or hostname." })),
  port: Type.Optional(Type.Number()),
  health_url: Type.Optional(Type.String()),
  source_path: Type.Optional(Type.String()),
  source_repo: Type.Optional(Type.String()),
  mind_identity_doc_id: Type.Optional(Type.String()),
  responsibilities: Type.Optional(Type.Array(Type.String())),
  authority_can_autonomous: Type.Optional(Type.Array(Type.String())),
  authority_requires_approval: Type.Optional(Type.Array(Type.String())),
  triggers: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
  owner_email: Type.Optional(Type.String()),
  expected_interval_seconds: Type.Optional(Type.Number()),
  kind: Type.Optional(Type.Union([Type.Literal("agent"), Type.Literal("workflow")])),
  // workflow extras
  steps_json: Type.Optional(Type.String({ description: "JSON-encoded array of WorkflowStep dicts." })),
  trigger_summary: Type.Optional(Type.String()),
  inputs_summary: Type.Optional(Type.String()),
  outputs_summary: Type.Optional(Type.String()),
  credentials_required: Type.Optional(Type.Array(Type.String())),
  // list filters
  list_status: Type.Optional(Type.String()),
  list_host: Type.Optional(Type.String()),
  list_tag: Type.Optional(Type.String()),
  list_kind: Type.Optional(Type.Union([Type.Literal("agent"), Type.Literal("workflow")])),
  list_query: Type.Optional(Type.String()),
  include_archived: Type.Optional(Type.Boolean()),
  // delete
  hard: Type.Optional(Type.Boolean()),
  // heartbeat
  current_job: Type.Optional(Type.String()),
  metrics: Type.Optional(Type.Record(Type.String(), Type.Any())),
  source: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
  // log_activity
  activity_type: Type.Optional(Type.String()),
  activity_payload: Type.Optional(Type.Record(Type.String(), Type.Any())),
  limit: Type.Optional(Type.Number({ description: "Max activities (list_activities). Default: 50." })),
  // seed_known
  overwrite: Type.Optional(Type.Boolean()),
  // transfer / share
  owner_username: Type.Optional(Type.String()),
  grantee_username: Type.Optional(Type.String()),
  share_role: Type.Optional(Type.Union([Type.Literal("owner"), Type.Literal("viewer")])),
  share_id: Type.Optional(Type.String()),
  // invoices
  invoice_id: Type.Optional(Type.String()),
  bill_to_name: Type.Optional(Type.String()),
  bill_to_company: Type.Optional(Type.String()),
  bill_to_email: Type.Optional(Type.String()),
  line_item_description: Type.Optional(Type.String()),
  quantity: Type.Optional(Type.Number()),
  unit_price: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String()),
  invoice_notes: Type.Optional(Type.String()),
  // workflows
  workflow_slug: Type.Optional(Type.String()),
});

type AgentsParams = Static<typeof AgentsParameters>;

export function createMindAgentsTool(deps: ToolDeps) {
  return {
    name: "mind_agents",
    label: "MIND Agents",
    description:
      "Admin-only Agent Command Center — canonical registry of every Astra AI agent (running on VPS, planned, archived). Query before scaffolding a new agent. Update status / current_job / responsibilities after non-trivial work. Every agent is owned by a MIND account (owner_username) and can be transferred or shared with other accounts as owner/viewer. Backed by /admin/agents on the MIND backend; admin API key required.",
    parameters: AgentsParameters,
    async execute(_toolCallId: string, params: AgentsParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listAgents({
              status: params.list_status,
              host: params.list_host,
              tag: params.list_tag,
              kind: params.list_kind,
              q: params.list_query,
              include_archived: params.include_archived,
            });
            const lines = r.agents.map(
              (a) =>
                `• [${a.live_status}/${a.status}] ${a.name} (${a.slug}) — ${a.host ?? "(no host)"}${a.current_job ? ` · ${a.current_job}` : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.stats.total} agent(s) (${r.stats.running} running, ${r.stats.planned} planned, ${r.stats.online} online):\n${lines.join("\n")}`,
                },
              ],
              details: r,
            };
          }
          case "get": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.getAgent(params.slug);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.name} (${r.slug}) — ${r.live_status}/${r.status}\nHost: ${r.host ?? "—"}\nOwner: ${r.owner_username}\n\n${r.description}\n\nResponsibilities:\n${r.responsibilities.map((x) => `• ${x}`).join("\n")}`,
                },
              ],
              details: r,
            };
          }
          case "create": {
            if (!params.slug || !params.name) return missing("slug, name");
            const payload: Record<string, unknown> = {
              slug: params.slug,
              name: params.name,
              description: params.description,
              status: params.status ?? "planned",
              cadence: params.cadence,
              host: params.host,
              host_address: params.host_address,
              port: params.port,
              health_url: params.health_url,
              source_path: params.source_path,
              source_repo: params.source_repo,
              mind_identity_doc_id: params.mind_identity_doc_id,
              responsibilities: params.responsibilities,
              triggers: params.triggers,
              tags: params.tags,
              owner_email: params.owner_email,
              expected_interval_seconds: params.expected_interval_seconds,
              kind: params.kind ?? "agent",
            };
            if (params.authority_can_autonomous || params.authority_requires_approval) {
              payload.authority = {
                can_autonomous: params.authority_can_autonomous ?? [],
                requires_approval: params.authority_requires_approval ?? [],
              };
            }
            if (params.kind === "workflow") {
              if (params.steps_json) {
                try {
                  payload.steps = JSON.parse(params.steps_json);
                } catch {
                  // ignore parse error; let backend reject
                }
              }
              payload.trigger_summary = params.trigger_summary;
              payload.inputs_summary = params.inputs_summary;
              payload.outputs_summary = params.outputs_summary;
              payload.credentials_required = params.credentials_required;
            }
            const r = await deps.client.createAgent(payload);
            return {
              content: [{ type: "text" as const, text: `Created ${r.kind} "${r.name}" (slug: ${r.slug})` }],
              details: r,
            };
          }
          case "update": {
            if (!params.slug) return missing("slug");
            const payload: Record<string, unknown> = {};
            const passthroughKeys: (keyof AgentsParams)[] = [
              "name",
              "description",
              "status",
              "cadence",
              "host",
              "host_address",
              "port",
              "health_url",
              "source_path",
              "source_repo",
              "mind_identity_doc_id",
              "responsibilities",
              "triggers",
              "tags",
              "owner_email",
              "expected_interval_seconds",
              "current_job",
              "kind",
              "trigger_summary",
              "inputs_summary",
              "outputs_summary",
              "credentials_required",
            ];
            for (const k of passthroughKeys) {
              if (params[k] !== undefined) payload[k as string] = params[k];
            }
            if (params.authority_can_autonomous || params.authority_requires_approval) {
              payload.authority = {
                can_autonomous: params.authority_can_autonomous ?? [],
                requires_approval: params.authority_requires_approval ?? [],
              };
            }
            if (params.steps_json) {
              try {
                payload.steps = JSON.parse(params.steps_json);
              } catch {
                // ignore
              }
            }
            const r = await deps.client.updateAgent(params.slug, payload);
            return {
              content: [{ type: "text" as const, text: `Updated agent ${r.slug}` }],
              details: r,
            };
          }
          case "delete": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.deleteAgent(params.slug, params.hard ?? false);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.hard ? "Hard-deleted" : "Archived"} agent ${r.deleted}`,
                },
              ],
              details: r,
            };
          }
          case "heartbeat": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.agentHeartbeat(params.slug, {
              current_job: params.current_job,
              metrics: params.metrics,
              source: params.source,
              note: params.note,
            });
            return {
              content: [
                { type: "text" as const, text: `Heartbeat ${r.slug} — live: ${r.live_status}` },
              ],
              details: r,
            };
          }
          case "probe": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.agentProbe(params.slug);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Probe ${r.slug} — ok: ${r.probe.ok}, status: ${r.probe.status_code ?? "?"}, latency: ${r.probe.latency_ms ?? "?"}ms${r.probe.error ? `, error: ${r.probe.error}` : ""}`,
                },
              ],
              details: r,
            };
          }
          case "log_activity": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.logAgentActivity(params.slug, {
              type: params.activity_type,
              payload: params.activity_payload,
              source: params.source,
            });
            return {
              content: [{ type: "text" as const, text: `Logged activity (${r.activity_id})` }],
              details: r,
            };
          }
          case "list_activities": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.listAgentActivities(params.slug, params.limit ?? 50);
            const lines = r.activities.map((a) => `• ${a.ts} — ${a.type} (${a.source})`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${r.activities.length} activity(ies):\n${lines.join("\n")}` : "No activities.",
                },
              ],
              details: r,
            };
          }
          case "import_from_mind": {
            const r = await deps.client.importAgentsFromMind();
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Enriched ${r.enriched} agent(s) from MIND (skipped ${r.skipped}).`,
                },
              ],
              details: r,
            };
          }
          case "seed_known": {
            const r = await deps.client.seedKnownAgents(params.overwrite ?? false);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Seed-known: +${r.inserted} inserted, ~${r.updated} updated, ${r.skipped} skipped (${r.total_known} canonical).`,
                },
              ],
              details: r,
            };
          }
          case "set_status": {
            if (!params.slug || !params.status) return missing("slug, status");
            const r = await deps.client.updateAgent(params.slug, { status: params.status });
            return {
              content: [{ type: "text" as const, text: `Set ${r.slug} → ${r.status}` }],
              details: r,
            };
          }
          case "set_current_job": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.updateAgent(params.slug, { current_job: params.current_job ?? null });
            return {
              content: [{ type: "text" as const, text: `Set ${r.slug} current_job → ${r.current_job ?? "(none)"}` }],
              details: r,
            };
          }
          case "transfer_owner": {
            if (!params.slug || !params.owner_username) return missing("slug, owner_username");
            const r = await deps.client.transferAgentOwner(params.slug, params.owner_username);
            return {
              content: [{ type: "text" as const, text: `Transferred ${r.slug} to ${r.owner_username}` }],
              details: r,
            };
          }
          case "share": {
            if (!params.slug || !params.grantee_username) return missing("slug, grantee_username");
            const r = await deps.client.shareAgent(params.slug, params.grantee_username, params.share_role ?? "viewer");
            return {
              content: [{ type: "text" as const, text: `Shared ${r.agent_slug} with ${r.grantee_username} as ${r.role}` }],
              details: r,
            };
          }
          case "list_shares": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.listAgentShares(params.slug);
            const lines = r.shares.map((s) => `• ${s.grantee_username} — ${s.role}`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Owner: ${r.owner_username}\nShares:\n${lines.join("\n") || "(none)"}`,
                },
              ],
              details: r,
            };
          }
          case "revoke_share": {
            if (!params.slug || !params.share_id) return missing("slug, share_id");
            const r = await deps.client.revokeAgentShare(params.slug, params.share_id);
            return {
              content: [{ type: "text" as const, text: `Revoked share ${r.revoked} on ${r.slug}` }],
              details: r,
            };
          }
          case "list_invoices": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.listAgentInvoices(params.slug);
            return {
              content: [{ type: "text" as const, text: `${r.invoices.length} invoice(s) on ${r.slug}` }],
              details: r,
            };
          }
          case "link_invoice": {
            if (!params.slug || !params.invoice_id) return missing("slug, invoice_id");
            const r = await deps.client.linkAgentInvoice(params.slug, params.invoice_id);
            return {
              content: [{ type: "text" as const, text: `Linked invoice ${params.invoice_id} to ${params.slug}` }],
              details: r,
            };
          }
          case "unlink_invoice": {
            if (!params.slug || !params.invoice_id) return missing("slug, invoice_id");
            const r = await deps.client.unlinkAgentInvoice(params.slug, params.invoice_id);
            return {
              content: [{ type: "text" as const, text: `Unlinked invoice ${params.invoice_id} from ${params.slug}` }],
              details: r,
            };
          }
          case "create_invoice": {
            if (!params.slug || !params.bill_to_name)
              return missing("slug, bill_to_name");
            const payload: Record<string, unknown> = {
              bill_to_name: params.bill_to_name,
              bill_to_company: params.bill_to_company,
              bill_to_email: params.bill_to_email,
              line_item_description: params.line_item_description,
              quantity: params.quantity ?? 1,
              unit_price: params.unit_price ?? 0,
              currency: params.currency ?? "USD",
              notes: params.invoice_notes,
            };
            const r = await deps.client.createAgentInvoice(params.slug, payload);
            return {
              content: [{ type: "text" as const, text: `Created invoice on ${params.slug}` }],
              details: r,
            };
          }
          case "list_workflows": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.listAgentWorkflows(params.slug);
            return {
              content: [{ type: "text" as const, text: `${r.workflows.length} workflow(s) on ${r.slug}` }],
              details: r,
            };
          }
          case "link_workflow": {
            if (!params.slug || !params.workflow_slug) return missing("slug, workflow_slug");
            const r = await deps.client.linkAgentWorkflow(params.slug, params.workflow_slug);
            return {
              content: [{ type: "text" as const, text: `Linked workflow ${params.workflow_slug} to ${params.slug}` }],
              details: r,
            };
          }
          case "unlink_workflow": {
            if (!params.slug || !params.workflow_slug) return missing("slug, workflow_slug");
            const r = await deps.client.unlinkAgentWorkflow(params.slug, params.workflow_slug);
            return {
              content: [{ type: "text" as const, text: `Unlinked workflow ${params.workflow_slug} from ${params.slug}` }],
              details: r,
            };
          }
          case "used_by": {
            if (!params.slug) return missing("slug");
            const r = await deps.client.workflowUsedBy(params.slug);
            return {
              content: [{ type: "text" as const, text: `Workflow ${r.name} used by ${r.agents.length} agent(s)` }],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_agents failed: ${msg}` }],
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
