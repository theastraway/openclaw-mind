/**
 * mind_accounts — Multi-MIND accounts (owner grants + invitations).
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const AccountsParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("create"),
      Type.Literal("delete"),
      Type.Literal("members"),
      Type.Literal("grant"),
      Type.Literal("invite"),
    ],
    { description: "Action: list (every MIND you can access), create, delete, members, grant, invite." },
  ),
  label: Type.Optional(Type.String({ description: "Display name — required for create." })),
  mind_username: Type.Optional(Type.String({ description: "MIND username — required for delete/members/grant/invite." })),
  grantee_username: Type.Optional(Type.String({ description: "MINDapp username to grant access to (grant)." })),
  email: Type.Optional(Type.String({ description: "Email address for invite." })),
  role: Type.Optional(
    Type.Union([Type.Literal("owner"), Type.Literal("viewer")], {
      description: "Access level: owner (full) or viewer (read-only). Default: owner.",
    }),
  ),
});

type AccountsParams = Static<typeof AccountsParameters>;

export function createMindAccountsTool(deps: ToolDeps) {
  return {
    name: "mind_accounts",
    label: "MIND Accounts",
    description:
      "Manage multi-MIND accounts. A 'MIND' is a knowledge-graph account; one person can own or be granted access to many. Use to discover every MIND you can access (list), spin up a new one (create), permanently delete one (delete), see who can access a MIND (members), grant an existing user access (grant), or email an invitation (invite).",
    parameters: AccountsParameters,
    async execute(_toolCallId: string, params: AccountsParams) {
      try {
        switch (params.action) {
          case "list": {
            const r = await deps.client.listMinds();
            if (!r.enabled) {
              return {
                content: [{ type: "text" as const, text: "Multi-MIND accounts not enabled on this server." }],
                details: r,
              };
            }
            const lines = (r.accounts ?? []).map(
              (a) =>
                `${a.is_active ? "▶ " : "  "}${a.label} (${a.username}) — ${a.role}${a.is_self ? " · self" : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.accounts.length} MIND(s) accessible by ${r.actor ?? "you"}:\n${lines.join("\n")}`,
                },
              ],
              details: r,
            };
          }
          case "create": {
            if (!params.label) {
              return {
                content: [{ type: "text" as const, text: "'label' is required for create." }],
                details: { error: "missing_label" },
              };
            }
            const r = await deps.client.createMind(params.label);
            return {
              content: [{ type: "text" as const, text: `Created MIND "${r.label}" (username: ${r.username})` }],
              details: r,
            };
          }
          case "delete": {
            if (!params.mind_username) {
              return {
                content: [{ type: "text" as const, text: "'mind_username' is required for delete." }],
                details: { error: "missing_mind_username" },
              };
            }
            const r = await deps.client.deleteMind(params.mind_username);
            return {
              content: [{ type: "text" as const, text: `Deleted MIND ${r.username}.` }],
              details: r,
            };
          }
          case "members": {
            if (!params.mind_username) {
              return {
                content: [{ type: "text" as const, text: "'mind_username' is required for members." }],
                details: { error: "missing_mind_username" },
              };
            }
            const r = await deps.client.listMindMembers(params.mind_username);
            const memberLines = r.members.map((m) => `• ${m.username} — ${m.role}${m.is_primary ? " · primary" : ""}`);
            const inviteLines = r.pending_invites.map((i) => `• pending: ${i.email} — ${i.role}`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Members of ${r.mind_username}:\n${[...memberLines, ...inviteLines].join("\n")}`,
                },
              ],
              details: r,
            };
          }
          case "grant": {
            if (!params.mind_username || !params.grantee_username) {
              return {
                content: [
                  { type: "text" as const, text: "'mind_username' and 'grantee_username' are required for grant." },
                ],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.grantMindMember(
              params.mind_username,
              params.grantee_username,
              params.role ?? "owner",
            );
            return {
              content: [
                { type: "text" as const, text: `Granted ${params.grantee_username} ${r.role} on ${r.username}.` },
              ],
              details: r,
            };
          }
          case "invite": {
            if (!params.mind_username || !params.email) {
              return {
                content: [{ type: "text" as const, text: "'mind_username' and 'email' are required for invite." }],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.createMindInvite(
              params.mind_username,
              params.email,
              params.role ?? "owner",
            );
            return {
              content: [
                { type: "text" as const, text: `Invite sent to ${r.email} as ${r.role}.\nLink: ${r.invite_link}` },
              ],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_accounts failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
