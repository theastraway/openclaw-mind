/**
 * Helpers for auto-syncing this OpenClaw agent's live session into MIND
 * Chat → Agents (see hooks/index.ts and AGENTS.md §2 SESSION LIFECYCLE,
 * github.com/theastraway/agents).
 *
 * Deliberately separate from lib/filter.ts: that filter is tuned for
 * knowledge-graph *fact extraction* (drop "ok"/"thanks", collapse generic
 * assistant replies) — dropping those same turns from the *session
 * transcript* would make the owner's MIND Chat view of the conversation
 * incomplete. Here we keep every real turn and only:
 *   - collapse tool-call messages to a one-line summary (never raw payloads,
 *     never file contents, never secrets — AGENTS.md §2.2)
 *   - truncate oversized content
 *   - drop truly empty messages
 */

import type { AgentSessionMessage, AgentSessionMessageInput, AgentSessionMessageRole } from "../mind-client.js";

interface ChatMessageLike {
  role?: string;
  content?: string;
}

const MAX_MESSAGE_CHARS = 4000;
const MAX_TOOL_SUMMARY_CHARS = 160;
const SESSION_ROLES = new Set<AgentSessionMessageRole>(["user", "assistant", "system", "tool"]);

/** First line of human phrasing to title a new session — never a machine-
 * derived id (tool-use ids, task blocks, pasted logs). Returns undefined
 * when there is nothing to draw on, per AGENTS.md §2.1 ("send no title;
 * set it on the next append"). */
export function deriveSessionTitle(prompt: string | undefined, messages: unknown[]): string | undefined {
  const candidate = prompt?.trim() || lastUserMessageContent(messages);
  if (!candidate) return undefined;
  const firstLine = candidate.split("\n")[0]?.trim();
  if (!firstLine) return undefined;
  return firstLine.length > 120 ? `${firstLine.slice(0, 120)}…` : firstLine;
}

function lastUserMessageContent(messages: unknown[]): string | undefined {
  const list = (messages ?? []) as ChatMessageLike[];
  const lastUser = [...list].reverse().find((m) => m.role === "user" && typeof m.content === "string");
  return lastUser?.content;
}

/** Turn this turn's chat messages into the shape mind_sessions append wants,
 * keeping every real exchange (unlike the knowledge-graph noise filter). */
export function toSessionAppendMessages(messages: ChatMessageLike[]): AgentSessionMessageInput[] {
  const out: AgentSessionMessageInput[] = [];
  const seen = new Set<string>();

  for (const m of messages) {
    if (!m.role || typeof m.content !== "string") continue;
    if (!SESSION_ROLES.has(m.role as AgentSessionMessageRole)) continue;

    const role = m.role as AgentSessionMessageRole;
    let content = m.content.trim();
    if (content.length === 0) continue;

    if (role === "tool") {
      content = oneLineToolSummary(content);
    } else if (content.length > MAX_MESSAGE_CHARS) {
      content = `${content.slice(0, MAX_MESSAGE_CHARS)}…[truncated]`;
    }

    const key = `${role}:${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ role, content });
  }

  return out;
}

/** Collapse a tool-call message to a short summary — never the raw payload,
 * never file contents, never secrets (AGENTS.md §2.2). */
function oneLineToolSummary(content: string): string {
  const firstLine = content.split("\n")[0]?.trim() ?? "";
  const summary = firstLine.length > 0 ? firstLine : content.trim();
  return summary.length > MAX_TOOL_SUMMARY_CHARS
    ? `${summary.slice(0, MAX_TOOL_SUMMARY_CHARS)}…`
    : summary;
}

/** Render pending owner replies (from `open`/`append`) as a context block
 * the agent must answer first this turn — AGENTS.md §2.3. */
export function formatPendingReplies(pendingReplies: AgentSessionMessage[]): string {
  const lines = pendingReplies.map((m) => `> ${m.content}`);
  return [
    "## MIND Chat — the owner replied while you were away",
    "",
    "Answer this FIRST, before continuing anything else. This arrived in MIND Chat → Agents:",
    "",
    ...lines,
  ].join("\n");
}

/** A short human-readable summary for `close`, used when the agent itself
 * did not provide one (e.g. an OpenClaw-driven session_end). */
export function buildAutoCloseSummary(opts: {
  reason?: string;
  messageCount?: number;
  durationMs?: number;
}): string {
  const parts: string[] = [];
  if (opts.messageCount !== undefined) {
    parts.push(`${opts.messageCount} message(s)`);
  }
  if (opts.durationMs !== undefined) {
    parts.push(`${Math.round(opts.durationMs / 1000)}s`);
  }
  const stats = parts.length ? ` (${parts.join(", ")})` : "";
  return `Session ended${stats}${opts.reason ? ` — reason: ${opts.reason}` : ""}.`;
}
