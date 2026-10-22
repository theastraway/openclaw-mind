/**
 * mind_sessions — Agent Sessions in MIND Chat.
 *
 * Logs THIS agent's own live session into MIND Chat → Agents so Anthony (or
 * whoever owns this MIND account) can read the transcript and reply — the
 * reply reaches the agent on its next turn via `pending_replies`. Distinct
 * from mind_remember (one durable fact) and mind_train (teaching the KG):
 * this is the live, turn-by-turn session log, mirrored into a MIND document
 * when the session is closed.
 *
 * Canonical parity: mirrors mind_sessions in @astramindapp/mcp-server (see
 * mcp-server/src/server.ts) — same action names, same parameter shapes, same
 * client method names — so an agent moving between OpenClaw and an MCP host
 * sees the identical surface. Full protocol: AGENTS.md §2 SESSION LIFECYCLE
 * (github.com/theastraway/agents).
 *
 * PROTOCOL (do this every session):
 *   1. CONNECT — as soon as mind_context succeeds, call action=open with
 *      source_key (your assigned MIND Chat toggle, e.g. "openclaw"),
 *      external_session_id (your runtime's own session id), runtime, title
 *      (first user ask, 6-10 words), machine/cwd/repo/branch/model. If
 *      `resumed` is true, read `tail` before answering, and answer
 *      everything in `pending_replies` first — those arrived while you were
 *      away.
 *   2. EVERY TURN — after you finish replying, call action=append with the
 *      user's message and your final reply (role user / assistant); tool
 *      calls go in as role=tool one-line summaries, never raw payloads.
 *      Check `pending_replies` on the response and answer them next turn.
 *      action=reply is a shortcut for appending a single assistant-role
 *      message when you have no user message to log alongside it.
 *   3. IDLE — MIND marks the session idle after 30 minutes with no append;
 *      the next append revives it, nothing to do meanwhile. A long-running
 *      agent should append a role=system heartbeat line at least every 25
 *      minutes so it is never shown idle while it is actually working.
 *   4. TERMINATE — on exit, compaction, or "done", call action=close with a
 *      summary (what was asked, what shipped with ids/PR numbers, what is
 *      still undone); MIND mirrors the transcript into the Sessions folder
 *      as a document.
 *   5. HANDOFF — to pass the conversation to another agent, call
 *      action=handoff with to_source_key=<their toggle>; they see it in
 *      their session list with the transcript as context.
 *
 * Never claim a session is synced without the session_id MIND returned.
 * Never log secrets or raw tool payloads. Sessions are PRIVATE — never a
 * feed post, never a thought (Gate 12).
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const SessionsParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("open"),
      Type.Literal("append"),
      Type.Literal("close"),
      Type.Literal("list"),
      Type.Literal("get"),
      Type.Literal("reply"),
      Type.Literal("inbox"),
      Type.Literal("handoff"),
      Type.Literal("sources"),
    ],
    { description: "Which agent-session operation to perform." },
  ),
  // open
  source_key: Type.Optional(
    Type.String({
      description:
        'Your assigned MIND Chat sidebar toggle slug, e.g. "openclaw" — required for open; also filters list; also required for sources action=create (as the new source\'s key).',
    }),
  ),
  external_session_id: Type.Optional(
    Type.String({
      description:
        "Your runtime's own session id — required for open. Idempotent: opening the same (source_key, external_session_id) again resumes the existing session instead of creating a new one.",
    }),
  ),
  runtime: Type.Optional(
    Type.String({
      description:
        'Runtime name, e.g. "openclaw", "claude-code", "codex", "cursor", "grok", "n8n", "custom" — open (used if the source is auto-created); sources action=create/update.',
    }),
  ),
  source_label: Type.Optional(
    Type.String({
      description:
        'Human-readable label for an auto-created source on open, e.g. "OpenClaw 1" — defaults to the titlecased source_key if omitted.',
    }),
  ),
  title: Type.Optional(
    Type.String({ description: "Session title (first user ask, 6-10 words) — open (initial) or append (updates it)." }),
  ),
  machine: Type.Optional(Type.String({ description: "Machine identifier — open." })),
  cwd: Type.Optional(Type.String({ description: "Working directory — open." })),
  repo: Type.Optional(Type.String({ description: "Repository name — open." })),
  branch: Type.Optional(Type.String({ description: "Git branch — open." })),
  model: Type.Optional(Type.String({ description: "LLM model in use — open." })),
  tags: Type.Optional(Type.Array(Type.String(), { description: "Freeform tags — open." })),
  // append / reply
  session_id: Type.Optional(
    Type.String({ description: "Session id returned by open — required for append/close/get/inbox/handoff." }),
  ),
  messages: Type.Optional(
    Type.Array(
      Type.Object({
        role: Type.Union([
          Type.Literal("user"),
          Type.Literal("assistant"),
          Type.Literal("system"),
          Type.Literal("tool"),
        ]),
        content: Type.String(),
        origin: Type.Optional(Type.Literal("agent")),
        meta: Type.Optional(Type.Record(Type.String(), Type.Any())),
        created_at: Type.Optional(Type.String()),
      }),
      {
        description:
          "Messages to append, in order — required for append. Tool-call messages should be role=tool, one-line summaries only, never raw payloads.",
      },
    ),
  ),
  content: Type.Optional(
    Type.String({ description: "Message text — required for reply (appended as a single role=assistant message)." }),
  ),
  // close
  summary: Type.Optional(
    Type.String({
      description:
        "What was asked, what shipped (with ids/PR numbers), what is still undone — close. If omitted, MIND builds one from the transcript.",
    }),
  ),
  // list / close (status set) share this field
  status: Type.Optional(
    Type.Union([Type.Literal("active"), Type.Literal("idle"), Type.Literal("ended")], {
      description:
        'close: pass "ended" to explicitly close (default when summary is given). list: filter sessions by status.',
    }),
  ),
  q: Type.Optional(Type.String({ description: "Free-text search over title/preview — list." })),
  limit: Type.Optional(Type.Number({ description: "Max results — list (default 30) / get (default 200, messages)." })),
  before: Type.Optional(Type.String({ description: "Pagination cursor (last_activity_at) — list." })),
  before_seq: Type.Optional(Type.Number({ description: "Return messages with seq before this value — get." })),
  // handoff
  to_source_key: Type.Optional(Type.String({ description: "Target source's key to hand this session off to — required for handoff." })),
  // sources
  source_action: Type.Optional(
    Type.Union([Type.Literal("list"), Type.Literal("create"), Type.Literal("update"), Type.Literal("delete")], {
      description: "Sub-action for action=sources (default list).",
    }),
  ),
  source_id: Type.Optional(Type.String({ description: "Source id — required for sources action=update/delete." })),
  key: Type.Optional(Type.String({ description: "New source's key slug — required for sources action=create." })),
  label: Type.Optional(
    Type.String({ description: 'Source label, e.g. "OpenClaw 1" — sources action=create (required) / update.' }),
  ),
  color: Type.Optional(Type.String({ description: "Sidebar chip color — sources action=create/update." })),
  wake_url: Type.Optional(
    Type.String({
      description:
        "Optional push endpoint MIND POSTs {session_id, reply} to (fire-and-forget, 5s timeout) when the user replies — sources action=create/update.",
    }),
  ),
  force: Type.Optional(
    Type.Boolean({
      description: "sources action=delete: also delete the source's sessions instead of failing 409 when sessions exist.",
    }),
  ),
});

type SessionsParams = Static<typeof SessionsParameters>;

export function createMindSessionsTool(deps: ToolDeps) {
  return {
    name: "mind_sessions",
    label: "MIND Agent Sessions",
    description:
      "Log THIS agent's own live session into MIND Chat → Agents, so the owner can read the transcript and reply — their reply reaches you on your next turn via pending_replies. Distinct from mind_remember (one durable fact) and mind_train (teaching the KG): this is the live, turn-by-turn session log, mirrored into a MIND document when you close it.\n\n" +
      "PROTOCOL (do this every session): " +
      "1) CONNECT — as soon as mind_context succeeds, call action=open with source_key (your assigned MIND Chat toggle, e.g. \"openclaw\"), external_session_id (your runtime's own session id), runtime, title (first user ask, 6-10 words), machine/cwd/repo/branch/model. If `resumed` is true, read `tail` before answering, and answer everything in `pending_replies` first — those arrived while you were away. " +
      "2) EVERY TURN — after you finish replying, call action=append with the user's message and your final reply (role user / assistant); tool calls go in as role=tool one-line summaries, never raw payloads. Check `pending_replies` on the response and answer them next turn. action=reply is a shortcut for appending a single assistant-role message when you have no user message to log alongside it. " +
      "3) IDLE — MIND marks the session idle after 30 minutes with no append; the next append revives it, nothing to do meanwhile. " +
      "4) TERMINATE — on exit, compaction, or \"done\", call action=close with a summary (what was asked, what shipped with ids/PR numbers, what is still undone); MIND mirrors the transcript into your Sessions folder as a document. " +
      "5) HANDOFF — to pass the conversation to another agent, call action=handoff with to_source_key=<their toggle>; they see it in their session list with the transcript as context. " +
      "Never claim a session is synced without the session_id MIND returned. Never log secrets or raw tool payloads. Sessions are PRIVATE — never a feed post, never a thought.\n\n" +
      "Actions: open, append, close, list, get, reply (alias for append of one assistant message), inbox (undelivered mind-origin replies), handoff, sources (source_action=list|create|update|delete manages the MIND Chat sidebar toggles — auto-created on first open with an unknown source_key).",
    parameters: SessionsParameters,
    async execute(_toolCallId: string, params: SessionsParams) {
      try {
        switch (params.action) {
          case "open": {
            if (!params.source_key) return missing("source_key");
            if (!params.external_session_id) return missing("external_session_id");
            const r = await deps.client.openAgentSession({
              source_key: params.source_key,
              external_session_id: params.external_session_id,
              runtime: params.runtime,
              source_label: params.source_label,
              title: params.title,
              machine: params.machine,
              cwd: params.cwd,
              repo: params.repo,
              branch: params.branch,
              model: params.model,
              tags: params.tags,
            });
            const replyNote = r.pending_replies?.length
              ? ` — ${r.pending_replies.length} pending repl${r.pending_replies.length === 1 ? "y" : "ies"} from the owner: answer these FIRST.`
              : "";
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Session ${r.session_id} ${r.resumed ? "resumed" : "opened"} (status: ${r.status}).${replyNote}`,
                },
              ],
              details: r,
            };
          }

          case "append": {
            if (!params.session_id) return missing("session_id");
            if (!params.messages?.length) return missing("messages (at least one)");
            const r = await deps.client.appendAgentSession(params.session_id, params.messages, params.title);
            const replyNote = r.pending_replies?.length
              ? ` — ${r.pending_replies.length} pending repl${r.pending_replies.length === 1 ? "y" : "ies"} from the owner: answer these FIRST.`
              : "";
            return {
              content: [{ type: "text" as const, text: `Appended through seq ${r.seq_last}.${replyNote}` }],
              details: r,
            };
          }

          case "reply": {
            if (!params.session_id) return missing("session_id");
            if (!params.content) return missing("content");
            const r = await deps.client.appendAgentSession(params.session_id, [
              { role: "assistant", content: params.content },
            ]);
            return {
              content: [{ type: "text" as const, text: `Replied (seq ${r.seq_last}).` }],
              details: r,
            };
          }

          case "close": {
            if (!params.session_id) return missing("session_id");
            const r = await deps.client.closeAgentSession(params.session_id, {
              summary: params.summary,
              status: params.status === "ended" ? "ended" : undefined,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Closed. ${r.mirror_doc_id ? `Mirrored to document ${r.mirror_doc_id}.` : ""}`,
                },
              ],
              details: r,
            };
          }

          case "list": {
            const r = await deps.client.listAgentSessions({
              source_key: params.source_key,
              status: params.status,
              q: params.q,
              limit: params.limit,
              before: params.before,
            });
            const lines = r.sessions.map(
              (s) =>
                `• [${s.status}] ${s.title} (${s.session_id}) — ${s.source_key}${s.pending_reply_count ? ` · ${s.pending_reply_count} pending repl${s.pending_reply_count === 1 ? "y" : "ies"}` : ""}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.sessions.length} session(s):\n${lines.join("\n") || "(none)"}`,
                },
              ],
              details: r,
            };
          }

          case "get": {
            if (!params.session_id) return missing("session_id");
            const r = await deps.client.getAgentSession(params.session_id, {
              limit: params.limit,
              before_seq: params.before_seq,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.title} (${r.session_id}) — ${r.status}, ${r.message_count} message(s).`,
                },
              ],
              details: r,
            };
          }

          case "inbox": {
            if (!params.session_id) return missing("session_id");
            const r = await deps.client.agentSessionInbox(params.session_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.pending_replies.length} pending repl${r.pending_replies.length === 1 ? "y" : "ies"}.`,
                },
              ],
              details: r,
            };
          }

          case "handoff": {
            if (!params.session_id) return missing("session_id");
            if (!params.to_source_key) return missing("to_source_key");
            const r = await deps.client.handoffAgentSession(params.session_id, params.to_source_key);
            return {
              content: [{ type: "text" as const, text: `Handed off ${r.session_id} to ${r.source_key}.` }],
              details: r,
            };
          }

          case "sources": {
            const sourceAction = params.source_action ?? "list";
            switch (sourceAction) {
              case "list": {
                const r = await deps.client.listAgentSessionSources();
                const lines = r.sources.map((s) => `• ${s.label} (${s.key}) — ${s.runtime}, ${s.session_count} session(s)`);
                return {
                  content: [{ type: "text" as const, text: lines.join("\n") || "(no sources)" }],
                  details: r,
                };
              }
              case "create": {
                if (!params.key) return missing("key");
                if (!params.label) return missing("label");
                if (!params.runtime) return missing("runtime");
                const r = await deps.client.createAgentSessionSource({
                  key: params.key,
                  label: params.label,
                  runtime: params.runtime,
                  color: params.color,
                  wake_url: params.wake_url,
                });
                return {
                  content: [{ type: "text" as const, text: `Created source ${r.key} (${r.source_id}).` }],
                  details: r,
                };
              }
              case "update": {
                if (!params.source_id) return missing("source_id");
                const r = await deps.client.updateAgentSessionSource(params.source_id, {
                  label: params.label,
                  runtime: params.runtime,
                  color: params.color,
                  wake_url: params.wake_url,
                });
                return {
                  content: [{ type: "text" as const, text: `Updated source ${r.source_id}.` }],
                  details: r,
                };
              }
              case "delete": {
                if (!params.source_id) return missing("source_id");
                const r = await deps.client.deleteAgentSessionSource(params.source_id, params.force);
                return {
                  content: [{ type: "text" as const, text: `Deleted source ${params.source_id}.` }],
                  details: r,
                };
              }
            }
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_sessions failed: ${msg}` }],
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
