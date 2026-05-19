/**
 * Lifecycle hooks for openclaw-mind.
 *
 * Uses OpenClaw's `api.on(event, handler)` registration pattern.
 *   - "before_prompt_build" — fires before a prompt is sent to the model.
 *     Return { prependContext: string } to inject memories.
 *   - "agent_end" — fires after an agent turn completes.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";
import { isNonInteractiveTrigger, isSubagentSession } from "../lib/session.js";
import { filterMessagesForExtraction } from "../lib/filter.js";
import { MIND_BRIEFING } from "../mind-briefing.js";

// Local stubs for hook event/context shapes. The OpenClaw plugin-sdk does
// not re-export these from its public index, but the runtime delivers objects
// matching these shapes (verified against
// node_modules/openclaw/dist/plugin-sdk/src/plugins/types.d.ts at install time).
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

  // A `before_prompt_build` handler always runs: it injects the self-describing
  // MIND briefing once per session (so any agent knows it has MIND and how to
  // use it), and — when autoRecall is on — appends relevant memories.
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

        // 1. One-time briefing — the OpenClaw equivalent of an MCP server's
        //    `instructions` field. Tells the agent it has MIND and how to use
        //    everything, without anyone having to tell it.
        const sessionKey = ctx?.sessionKey ?? "default";
        if (!briefedSessions.has(sessionKey)) {
          briefedSessions.add(sessionKey);
          blocks.push(MIND_BRIEFING);
          api.logger.debug?.(`mind: injected session briefing (${sessionKey})`);
        }

        // 2. Auto-recall — relevant memories for the current request.
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

  if (config.autoCapture) {
    api.on(
      "agent_end",
      async (
        event: PluginHookAgentEndEvent,
        ctx: PluginHookAgentContext,
      ): Promise<void> => {
        try {
          if (isNonInteractiveTrigger(ctx?.trigger, ctx?.sessionKey)) return;
          if (isSubagentSession(ctx?.sessionKey)) return;
          if (!event.success) return; // skip captures from failed turns

          const messages = (event.messages ?? []) as ChatMessageLike[];
          const normalized = messages
            .filter((m): m is { role: string; content: string } =>
              typeof m.role === "string" && typeof m.content === "string",
            )
            .map((m) => ({ role: m.role, content: m.content }));

          const filtered = filterMessagesForExtraction(normalized);
          if (filtered.length === 0) return;

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
        } catch (err) {
          api.logger.warn(`mind auto-capture failed: ${(err as Error).message}`);
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
