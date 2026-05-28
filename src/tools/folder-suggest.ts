/**
 * mind_folder_suggest — LLM content-aware folder picker.
 *
 * Reads every folder's ``routing_hint`` (set via mind_folders set_hint) and
 * uses a cheap LLM to pick the best destination for a piece of content.
 * Returns ``folder_id=null`` when no folder's hint clearly applies — in
 * that case the caller should leave the doc unfiled rather than guess.
 *
 * Typical agent flow:
 *   1. mind_folder_suggest content:"…"  → folder_id
 *   2. mind_remember (create the doc)
 *   3. mind_folders move_documents → file it
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const FolderSuggestParameters = Type.Object({
  content: Type.String({
    description:
      "The text of the new document you're about to file. The picker reads it against every folder's routing_hint.",
  }),
  title: Type.Optional(
    Type.String({
      description: "Optional title — helps the picker disambiguate short content.",
    }),
  ),
});

type FolderSuggestParams = Static<typeof FolderSuggestParameters>;

export function createMindFolderSuggestTool(deps: ToolDeps) {
  return {
    name: "mind_folder_suggest",
    label: "MIND Folder Suggest",
    description:
      "Ask MIND which folder a piece of content belongs in. Reads every folder's routing_hint (set via mind_folders set_hint) and uses a cheap LLM to pick the best match. Returns folder_id=null when no folder's hint clearly applies — in that case leave the doc unfiled rather than guess. Typical agent flow: suggest → mind_remember (create doc) → mind_folders move_documents.",
    parameters: FolderSuggestParameters,
    async execute(_toolCallId: string, params: FolderSuggestParams) {
      try {
        const res = await deps.client.suggestFolder(params.content, params.title);
        if (!res.folder_id) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No folder match — ${res.reason}\n\nLeave the doc unfiled or call mind_folder_routes apply_recommended to set up the default folder layout.`,
              },
            ],
            details: res,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Suggested folder: ${res.folder_name} (id: ${res.folder_id})`,
                `Confidence: ${Math.round(res.confidence * 100)}%`,
                `Reason: ${res.reason}`,
              ].join("\n"),
            },
          ],
          details: res,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_folder_suggest failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
