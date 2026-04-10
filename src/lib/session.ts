/**
 * Session and namespace helpers for per-agent memory isolation.
 *
 * OpenClaw session key formats (mirrors @mem0/openclaw-mem0):
 *   - Main agent:   "agent:main:main"
 *   - Subagent:     "agent:main:subagent:<uuid>"
 *   - Named agent:  "agent:<agentId>:<session>"
 *
 * Subagent UUIDs are random per-spawn, so their namespaces are always empty
 * on recall and orphaned after capture. We skip both hooks for subagents.
 */

const NON_INTERACTIVE_TRIGGERS = new Set(["cron", "scheduled", "webhook", "event", "system"]);
const SUBAGENT_PATTERN = /:subagent:/;
const CRON_SESSION_PATTERN = /:cron:/;

export function isNonInteractiveTrigger(
  trigger: string | undefined,
  sessionKey: string | undefined,
): boolean {
  if (trigger && NON_INTERACTIVE_TRIGGERS.has(trigger.toLowerCase())) {
    return true;
  }
  if (sessionKey && CRON_SESSION_PATTERN.test(sessionKey)) {
    return true;
  }
  return false;
}

export function isSubagentSession(sessionKey: string | undefined): boolean {
  if (!sessionKey) return false;
  return SUBAGENT_PATTERN.test(sessionKey);
}

export function extractAgentId(sessionKey: string | undefined): string | undefined {
  if (!sessionKey) return undefined;
  const parts = sessionKey.split(":");
  // "agent:main:subagent:<uuid>" → return uuid
  if (parts[0] === "agent" && parts[1] === "main" && parts[2] === "subagent" && parts[3]) {
    return parts[3];
  }
  // "agent:<agentId>:<session>" — non-main named agent
  if (parts[0] === "agent" && parts[1] && parts[1] !== "main") {
    return parts[1];
  }
  return undefined;
}

export function effectiveUserId(baseUserId: string, sessionKey?: string): string {
  const agentId = extractAgentId(sessionKey);
  if (!agentId) return baseUserId;
  return `${baseUserId}:${agentId}`;
}
