/**
 * mind_remember — Store / search / get / list / delete memories.
 *
 * Umbrella tool that replaces the narrow mind_add / mind_get / mind_list /
 * mind_update / mind_delete tools — matches the canonical MCP-server surface
 * so an OpenClaw agent and a Claude Code agent call MIND identically.
 *
 * Auto-decides storage type from content length when not specified.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const RememberParameters = Type.Object({
  action: Type.Optional(
    Type.Union(
      [
        Type.Literal("create"),
        Type.Literal("delete"),
        Type.Literal("search"),
        Type.Literal("get"),
        Type.Literal("list"),
      ],
      {
        description:
          "Action: 'create' (store new content — default), 'delete' (by id), 'search' (find by query), 'get' (by id), 'list' (paginated).",
      },
    ),
  ),
  content: Type.Optional(
    Type.String({
      description:
        "What to remember — the actual content to store (required for create). Any length.",
    }),
  ),
  title: Type.Optional(
    Type.String({
      description: "Title (auto-generated from content for thoughts when omitted).",
    }),
  ),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry"), Type.Literal("thought")],
      {
        description:
          "Storage type. 'document' (long-form), 'entry' (medium — default), 'thought' (quick). Auto-decides by content length if omitted.",
      },
    ),
  ),
  tags: Type.Optional(Type.Array(Type.String(), { description: "Tags for categorization." })),
  source: Type.Optional(Type.String({ description: "Source identifier (e.g. 'openclaw-mind')." })),
  item_id: Type.Optional(Type.String({ description: "Item ID for delete/get actions." })),
  query: Type.Optional(Type.String({ description: "Search query for search action." })),
  limit: Type.Optional(Type.Number({ description: "Max items to return for list/search." })),
  page: Type.Optional(Type.Number({ description: "Page number for list action." })),
});

type RememberParams = Static<typeof RememberParameters>;

function autoDecideType(content: string): "document" | "entry" | "thought" {
  const words = content.trim().split(/\s+/).length;
  if (words >= 200) return "document";
  if (words >= 30) return "entry";
  return "thought";
}

function deriveTitle(content: string): string {
  const firstLine = content.trim().split("\n")[0] ?? content;
  return firstLine.slice(0, 100).trim() || "Untitled memory";
}

export function createMindRememberTool(deps: ToolDeps) {
  return {
    name: "mind_remember",
    label: "MIND Remember",
    description:
      "Store and manage content in your MIND knowledge graph. Use for facts, decisions, learnings, research, notes — anything worth remembering. Auto-extracts entities + relationships; with MINDsense enabled, also assigns valence/arousal weights that drive encoding depth. Always log outcomes here after completing tasks. Supports create (default), delete, search, get, and list.",
    parameters: RememberParameters,
    async execute(_toolCallId: string, params: RememberParams) {
      const action = params.action ?? "create";
      try {
        switch (action) {
          case "create": {
            if (!params.content) {
              return {
                content: [{ type: "text" as const, text: "'content' is required for create." }],
                details: { error: "missing_content" },
              };
            }
            const type = params.type ?? autoDecideType(params.content);
            const title = params.title ?? deriveTitle(params.content);
            const source = params.source ?? "openclaw-mind";

            if (type === "document") {
              const doc = await deps.client.createDocument({
                title,
                content: params.content,
                tags: params.tags,
                source,
              });
              return {
                content: [
                  { type: "text" as const, text: `Stored as document "${doc.title}" (id: ${doc.id})` },
                ],
                details: { id: doc.id, type: "document", title: doc.title },
              };
            }

            const entry = await deps.client.createEntry({
              title,
              content: params.content,
              type: type === "thought" ? "thought" : "entry",
              tags: params.tags,
              source,
            });
            const id = entry.id ?? entry.entry_id ?? "";
            return {
              content: [{ type: "text" as const, text: `Stored as ${type} "${entry.title ?? title}" (id: ${id})` }],
              details: { id, type, title: entry.title ?? title },
            };
          }

          case "delete": {
            if (!params.item_id) {
              return {
                content: [{ type: "text" as const, text: "'item_id' is required for delete." }],
                details: { error: "missing_item_id" },
              };
            }
            try {
              await deps.client.deleteEntry(params.item_id);
            } catch {
              // Fall back to document delete if entry not found
              await deps.client.deleteDocument(params.item_id);
            }
            return {
              content: [{ type: "text" as const, text: `Deleted ${params.item_id}.` }],
              details: { id: params.item_id, status: "deleted" },
            };
          }

          case "get": {
            if (!params.item_id) {
              return {
                content: [{ type: "text" as const, text: "'item_id' is required for get." }],
                details: { error: "missing_item_id" },
              };
            }
            try {
              const entry = await deps.client.getEntry(params.item_id);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `${entry.title ?? "(untitled)"}\n\n${entry.content ?? ""}`,
                  },
                ],
                details: entry,
              };
            } catch {
              const doc = await deps.client.getDocument(params.item_id);
              return {
                content: [
                  { type: "text" as const, text: `${doc.title}\n\n${doc.content ?? doc.content_preview ?? ""}` },
                ],
                details: doc,
              };
            }
          }

          case "list": {
            const limit = params.limit ?? 20;
            const page = params.page ?? 1;
            const docs = await deps.client.listDocuments({ page, page_size: limit });
            const docList = (docs.documents ?? [])
              .map((d) => `• [doc] ${d.title} (id: ${d.id})`)
              .join("\n");
            const entries = await deps.client.listEntries({ limit });
            const entryList = (entries.entries ?? [])
              .map((e) => `• [entry] ${e.title ?? "(untitled)"} (id: ${e.id ?? e.entry_id})`)
              .join("\n");
            const out = [docList, entryList].filter(Boolean).join("\n");
            return {
              content: [
                {
                  type: "text" as const,
                  text: out || "No memories yet.",
                },
              ],
              details: { documents: docs.documents, entries: entries.entries },
            };
          }

          case "search": {
            const query = params.query;
            if (!query) {
              return {
                content: [{ type: "text" as const, text: "'query' is required for search." }],
                details: { error: "missing_query" },
              };
            }
            const limit = params.limit ?? 15;
            const found = await deps.client.searchEntries(query, limit);
            const lines = (found.entries ?? []).map(
              (e) => `• ${e.title ?? "(untitled)"} — ${(e.content ?? "").slice(0, 120)}…  (id: ${e.id ?? e.entry_id})`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length
                    ? `Found ${lines.length} match(es):\n${lines.join("\n")}`
                    : "No matches.",
                },
              ],
              details: found,
            };
          }

          default:
            return {
              content: [{ type: "text" as const, text: `Unknown action: ${action}` }],
              details: { error: "unknown_action" },
            };
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_remember failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
