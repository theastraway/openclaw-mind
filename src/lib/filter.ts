/**
 * Pre-extraction message filtering: noise detection, content stripping,
 * generic assistant detection, deduplication.
 *
 * Mirrors the filtering in @mem0/openclaw-mem0 to ensure auto-capture
 * doesn't store cron heartbeats, single-word acknowledgments, or system
 * routing metadata in the MIND knowledge graph.
 */

interface Message {
  role: string;
  content: string;
}

const NOISE_PATTERNS = [
  /^heartbeat\b/i,
  /^cron:/i,
  /^ping$/i,
  /^pong$/i,
  /^ok$/i,
  /^thanks$/i,
  /^thank you$/i,
  /^got it$/i,
  /^sure$/i,
  /^yes$/i,
  /^no$/i,
];

const GENERIC_ASSISTANT_PATTERNS = [
  /^how can i (help|assist) you/i,
  /^what (can|would you like)/i,
  /^i('m| am) (here to help|happy to help)/i,
  /^sure[,.!]? (i can|let me)/i,
  /^certainly[,.!]/i,
];

const NOISE_FRAGMENTS = [
  /<routing-metadata>[\s\S]*?<\/routing-metadata>/g,
  /<compaction-audit>[\s\S]*?<\/compaction-audit>/g,
  /<openclaw:heartbeat>[\s\S]*?<\/openclaw:heartbeat>/g,
];

const MAX_MESSAGE_CHARS = 4000;

export function isNoiseMessage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length < 4) return true;
  return NOISE_PATTERNS.some((p) => p.test(trimmed));
}

export function isGenericAssistantMessage(content: string): boolean {
  const trimmed = content.trim();
  // Only flag SHORT generic responses; long responses likely have substance
  if (trimmed.length > 200) return false;
  return GENERIC_ASSISTANT_PATTERNS.some((p) => p.test(trimmed));
}

export function stripNoiseFromContent(content: string): string {
  let result = content;
  for (const pattern of NOISE_FRAGMENTS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

export function filterMessagesForExtraction(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const filtered: Message[] = [];

  for (const msg of messages) {
    let content = stripNoiseFromContent(msg.content);

    if (isNoiseMessage(content)) continue;
    if (msg.role === "assistant" && isGenericAssistantMessage(content)) continue;

    // Truncate
    if (content.length > MAX_MESSAGE_CHARS) {
      content = `${content.slice(0, MAX_MESSAGE_CHARS)}…[truncated]`;
    }

    // Dedupe by exact content
    const key = `${msg.role}:${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    filtered.push({ role: msg.role, content });
  }

  return filtered;
}
