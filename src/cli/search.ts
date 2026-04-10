/**
 * `openclaw mind search "query"` — Quick CLI search of the MIND KG.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient, QueryMode } from "../mind-client.js";

interface SearchOpts {
  query: string;
  mode?: string;
  topK?: string;
}

export async function searchCommand(
  api: OpenClawPluginApi,
  client: MindClient | null,
  opts: SearchOpts,
): Promise<void> {
  if (!client) {
    api.logger.error("MIND not configured. Run: openclaw mind init --api-key mind_...");
    return;
  }

  if (!opts.query) {
    api.logger.error("Usage: openclaw mind search \"your query\"");
    return;
  }

  const mode = (opts.mode ?? "hybrid") as QueryMode;
  const topK = parseInt(opts.topK ?? "5", 10);

  try {
    const result = await client.query({
      query: opts.query,
      mode,
      top_k: topK,
    });

    api.logger.info(`\n${result.answer}\n`);

    if (result.sources && result.sources.length > 0) {
      const sourceLines = result.sources.map((s, i) => {
        const score = s.score ? `(score: ${s.score.toFixed(2)})` : "";
        return `  ${i + 1}. ${s.title ?? "(untitled)"} ${score}`;
      });
      api.logger.info(`Sources:\n${sourceLines.join("\n")}`);
    }
  } catch (err) {
    api.logger.error(`Search failed: ${(err as Error).message}`);
  }
}
