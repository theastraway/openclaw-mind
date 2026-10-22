/**
 * Lifecycle hooks for openclaw-mind.
 *
 * Uses OpenClaw's `api.on(event, handler)` registration pattern.
 *   - "before_prompt_build" — fires before a prompt is sent to the model.
 *     Return { prependContext: string } to inject memories.
 *   - "agent_end" — fires after an agent turn completes.
 *   - "session_end" — fires when OpenClaw ends its own session object
 *     (shutdown, reset, idle timeout, or a compaction rollover to a new
 *     session id).
 *
 * ─── Agent Session auto-sync (MIND Chat → Agents) ─────────────────────────
 * This is what makes "install the plugin" sufficient for an OpenClaw agent
 * to show up in MIND Chat with no extra tool calls, mirroring AGENTS.md §2
 * SESSION LIFECYCLE (github.com/theastraway/agents):
 *
 *   before_prompt_build (first turn of a session) → mind_sessions open
 *     Uses ctx.sessionId as the external_session_id — OpenClaw's own id —
 *     so reopening the same session (e.g. after a restart) resumes the
 *     same MIND record instead of creating a new one (idempotent by
 *     design, AGENTS.md §2.1). Any pending_replies returned (the owner
 *     replying to a resumed session) are injected into this turn's context
 *     so the agent answers them first.
 *   agent_end (every turn) → mind_sessions append
 *     Both sides of the exchange, tool calls collapsed to one-line
 *     summaries. Any pending_replies on the response are surfaced on the
 *     NEXT before_prompt_build call.
 *   session_end (OpenClaw ends its own session object) → mind_sessions close
 *     Covers shutdown/reset/idle-timeout/compaction-rollover alike — see
 *     the comment on the session_end handler below for why compaction is
 *     included.
 *
 * This still leaves the `mind_sessions` tool registered (see tools/index.ts)
 * for manual control — a rich close summary, a handoff to another agent,
 * or sources management — but an agent that never calls it is still synced.
 *
 * Deliberate scope limits (documented here rather than silently applied):
 *   - Subagent sessions (`isSubagentSession`) are NOT auto-synced, same as
 *     autoRecall/autoCapture above — their session keys are random per
 *     spawn and would appear as a flood of orphaned, un-resumable sessions.
 *     The orchestrating top-level session already carries the narrative.
 *   - Non-interactive triggers (cron/scheduled/webhook/event/system) are
 *     NOT auto-synced either, for the same reason: a cron tick every few
 *     minutes would flood MIND Chat with sessions nobody reads. A
 *     long-running scheduled agent that wants visibility should call
 *     `mind_sessions` itself on its own cadence (see AGENTS.md §12 THE
 *     HEARTBEAT) rather than relying on this per-turn hook.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as os from "node:os";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";
import { isNonInteractiveTrigger, isSubagentSession } from "../lib/session.js";
import { filterMessagesForExtraction } from "../lib/filter.js";
import {
  buildAutoCloseSummary,
  deriveSessionTitle,
  formatPendingReplies,
  toSessionAppendMessages,
} from "../lib/agent-session-sync.js";
import { MIND_BRIEFING } from "../mind-briefing.js";

// Local stubs for hook event/context shapes. The OpenClaw plugin-sdk does
// not re-export these from its public index, but the runtime delivers objects
// matching these shapes (verified against
// node_modules/openclaw/dist/hook-types-*.d.ts at install time).
interface PluginHookBeforePromptBuildEvent {
  prompt: string;
  messages: unknown[];
}

interface PluginHookBeforePromptBuildResult {
  systemPrompt?: string;
  prependContext?: string;
}

interface PluginHookAgentEndEvent {
  messages: unknown[];
  success: boolean;
  error?: string;
  durationMs?: number;
}

interface PluginHookAgentContext {
  trigger?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  modelId?: string;
}

interface PluginHookSessionContext {
  agentId?: string;
  sessionId: string;
  sessionKey?: string;
}

interface PluginHookSessionEndEvent {
  sessionId: string;
  sessionKey?: string;
  messageCount: number;
  durationMs?: number;
  reason?: string;
}

interface ChatMessageLike {
  role?: string;
  content?: string;
}

export function registerLifecycleHooks(
  api: OpenClawPluginApi,
  client: MindClient,
  config: MindPluginConfig,
): void {
  // Sessions that have already received the one-time MIND briefing.
  const briefedSessions = new Set<string>();

  // ─── Agent Session auto-sync state ───
  // Keyed by sessionMapKey(ctx) (sessionKey, falling back to sessionId).
  // A MIND agent-session id, once opened, lives for as long as OpenClaw's
  // own session object does — see the module doc comment above.
  const mindSessionIdByKey = new Map<string, string>();
  // Owner replies (from open/append) waiting to be surfaced on the NEXT
  // before_prompt_build call, so they land in the very next turn's context.
  const pendingReplyBlockByKey = new Map<string, string>();

  function sessionMapKey(ctx: { sessionKey?: string; sessionId?: string }): string {
    return ctx.sessionKey ?? ctx.sessionId ?? "default";
  }

  // A `before_prompt_build` handler always runs: it injects the self-describing
  // MIND briefing once per session (so any agent knows it has MIND and how to
  // use it), opens/resumes this session's MIND Chat record on its first turn,
  // surfaces any owner replies, and — when autoRecall is on — appends
  // relevant memories.
  api.on(
    "before_prompt_build",
    async (
      event: PluginHookBeforePromptBuildEvent,
      ctx: PluginHookAgentContext,
    ): Promise<PluginHookBeforePromptBuildResult | void> => {
      try {
        if (isNonInteractiveTrigger(ctx?.trigger, ctx?.sessionKey)) return;
        if (isSubagentSession(ctx?.sessionKey)) return;

        const blocks: string[] = [];
        const sessionKey = ctx?.sessionKey ?? "default";

        // 1. One-time briefing — the OpenClaw equivalent of an MCP server's
        //    `instructions` field. Tells the agent it has MIND and how to use
        //    everything, without anyone having to tell it.
        if (!briefedSessions.has(sessionKey)) {
          briefedSessions.add(sessionKey);
          blocks.push(MIND_BRIEFING);
          api.logger.debug?.(`mind: injected session briefing (${sessionKey})`);
        }

        // 2. Agent Session auto-sync — open/resume on first turn, surface
        //    any owner reply that arrived while this agent was away.
        if (config.enableAgentSessionSync) {
          const key = sessionMapKey(ctx);
          if (!mindSessionIdByKey.has(key)) {
            try {
              const title = deriveSessionTitle(event.prompt, event.messages);
              const opened = await client.openAgentSession({
                source_key: config.agentSessionSourceKey,
                external_session_id: ctx.sessionId ?? key,
                runtime: "openclaw",
                title,
                machine: os.hostname(),
                cwd: ctx.workspaceDir,
                model: ctx.modelId,
              });
              mindSessionIdByKey.set(key, opened.session_id);
              api.logger.debug?.(
                `mind_sessions: ${opened.resumed ? "resumed" : "opened"} ${opened.session_id}`,
              );
              if (opened.pending_replies?.length) {
                blocks.push(formatPendingReplies(opened.pending_replies));
              }
            } catch (err) {
              api.logger.warn(`mind_sessions open failed: ${(err as Error).message}`);
            }
          } else {
            const pending = pendingReplyBlockByKey.get(key);
            if (pending) {
              blocks.push(pending);
              pendingReplyBlockByKey.delete(key);
            }
          }
        }

        // 3. Auto-recall — relevant memories for the current request.
        if (config.autoRecall) {
          const recallQuery = pickRecallQuery(event);
          if (recallQuery && recallQuery.length >= 5) {
            const result = await client.query({
              query: recallQuery,
              mode: config.queryMode,
              top_k: config.topK,
            });
            if (result.answer) {
              blocks.push(formatRecallContext(result));
              api.logger.debug?.(
                `mind auto-recall: injected ${result.sources?.length ?? 0} sources`,
              );
            }
          }
        }

        if (blocks.length === 0) return;
        // Canonical way to inject context — return prependContext
        return { prependContext: blocks.join("\n\n---\n\n") };
      } catch (err) {
        api.logger.warn(`mind before_prompt_build hook failed: ${(err as Error).message}`);
        return;
      }
    },
  );

  if (config.autoCapture || config.enableAgentSessionSync) {
    api.on(
      "agent_end",
      async (
        event: PluginHookAgentEndEvent,
        ctx: PluginHookAgentContext,
      ): Promise<void> => {
        if (isNonInteractiveTrigger(ctx?.trigger, ctx?.sessionKey)) return;
        if (isSubagentSession(ctx?.sessionKey)) return;

        const messages = (event.messages ?? []) as ChatMessageLike[];

        // Knowledge-graph auto-capture — one durable entry per turn. Skips
        // failed turns (nothing useful to extract) and pure noise via the
        // mem0-style filter.
        if (config.autoCapture && event.success) {
          try {
            const normalized = messages
              .filter((m): m is { role: string; content: string } =>
                typeof m.role === "string" && typeof m.content === "string",
              )
              .map((m) => ({ role: m.role, content: m.content }));

            const filtered = filterMessagesForExtraction(normalized);
            if (filtered.length > 0) {
              const conversationText = filtered
                .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
                .join("\n\n")
                .slice(0, 8000);

              await client.createEntry({
                content: conversationText,
                type: "entry",
                tags: ["openclaw", "auto-capture"],
                source: "openclaw-mind",
              });

              api.logger.debug?.("mind auto-capture: stored turn");
            }
          } catch (err) {
            api.logger.warn(`mind auto-capture failed: ${(err as Error).message}`);
          }
        }

        // Agent Session auto-sync — append both sides of this exchange,
        // regardless of success (a failed turn is still a turn the owner
        // should be able to see in MIND Chat).
        if (config.enableAgentSessionSync) {
          try {
            const key = sessionMapKey(ctx);
            const sessionId = mindSessionIdByKey.get(key);
            if (sessionId) {
              const sessionMessages = toSessionAppendMessages(messages);
              if (sessionMessages.length > 0) {
                const appended = await client.appendAgentSession(sessionId, sessionMessages);
                if (appended.pending_replies?.length) {
                  pendingReplyBlockByKey.set(key, formatPendingReplies(appended.pending_replies));
                } else {
                  pendingReplyBlockByKey.delete(key);
                }
                api.logger.debug?.(`mind_sessions: appended through seq ${appended.seq_last}`);
              }
            }
          } catch (err) {
            api.logger.warn(`mind_sessions append failed: ${(err as Error).message}`);
          }
        }
      },
    );
  }

  // Closes this OpenClaw session's MIND Chat record when OpenClaw ends its
  // own session object. Deliberately unconditional on `reason`: "shutdown"
  // and "reset" are obvious terminations, but "idle" and "compaction" are
  // too — OpenClaw's session_end for either one hands back a `nextSessionId`
  // and starts a fresh session object, so from MIND's side this session
  // really did end (a new mind_sessions open follows on the next turn of the
  // new session, idempotent per AGENTS.md §2.1). This is a different thing
  // from MIND's own 30-minute idle marker (§2.4), which needs no action here.
  if (config.enableAgentSessionSync) {
    api.on(
      "session_end",
      async (event: PluginHookSessionEndEvent, ctx: PluginHookSessionContext): Promise<void> => {
        try {
          if (isSubagentSession(ctx?.sessionKey)) return;
          const key = sessionMapKey(ctx);
          const sessionId = mindSessionIdByKey.get(key);
          if (!sessionId) return; // never opened — e.g. a session with zero turns
          await client.closeAgentSession(sessionId, {
            summary: buildAutoCloseSummary({
              reason: event.reason,
              messageCount: event.messageCount,
              durationMs: event.durationMs,
            }),
            status: "ended",
          });
          mindSessionIdByKey.delete(key);
          pendingReplyBlockByKey.delete(key);
          api.logger.debug?.(`mind_sessions: closed ${sessionId} (${event.reason ?? "unknown"})`);
        } catch (err) {
          api.logger.warn(`mind_sessions close failed: ${(err as Error).message}`);
        }
      },
    );
  }
}

function pickRecallQuery(event: PluginHookBeforePromptBuildEvent): string | undefined {
  if (event.prompt) return event.prompt;
  const messages = (event.messages ?? []) as ChatMessageLike[];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return typeof lastUser?.content === "string" ? lastUser.content : undefined;
}

function formatRecallContext(result: {
  answer: string;
  sources?: Array<{ title?: string }>;
}): string {
  const sourceList = (result.sources ?? [])
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s.title ?? "(untitled)"}`)
    .join("\n");

  return [
    "## Persistent Memory (MIND knowledge graph)",
    "",
    "Context retrieved from the user's MIND knowledge graph based on the current request. Use it to inform your response.",
    "",
    result.answer,
    sourceList ? `\n**Sources:**\n${sourceList}` : "",
  ].join("\n");
}
