/**
 * mind_add — Store a memory in the MIND knowledge graph.
 *
 * Unlike Mem0 which stores text, this auto-extracts entities + relationships +
 * (if MINDsense enabled) emotional valence/arousal weights.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const AddParameters = Type.Object({
  content: Type.String({
    description: "The fact or memory to store. Any length — short thoughts to multi-paragraph documents.",
  }),
  title: Type.Optional(
    Type.String({ description: "Optional title. Auto-generated from content if omitted." }),
  ),
  type: Type.Optional(
    Type.Union(
      [Type.Literal("document"), Type.Literal("entry"), Type.Literal("thought")],
      {
        description:
          "Storage type. 'document' (long-form), 'entry' (medium), 'thought' (quick). Default: auto-decide by content length.",
      },
    ),
  ),
  tags: Type.Optional(
    Type.Array(Type.String(), { description: "Optional tags for retrieval." }),
  ),
});

type AddParams = Static<typeof AddParameters>;

export function createMindAddTool(deps: ToolDeps) {
  return {
    name: "mind_add",
    label: "MIND Add Memory",
    description:
      "Store a memory in the MIND knowledge graph. Auto-extracts entities (people, places, concepts, events) and the relationships between them. If MINDsense is enabled, also assigns valence/arousal emotional weights that determine encoding depth — emotionally significant content is encoded more deeply, mirroring biological memory consolidation.",
    parameters: AddParameters,
    async execute(_toolCallId: string, params: AddParams) {
      try {
        const type = params.type ?? autoDecideType(params.content);
        const title = params.title ?? deriveTitle(params.content);

        if (type === "document") {
          const doc = await deps.client.createDocument({
            title,
            content: params.content,
            tags: params.tags,
            source: "openclaw-mind",
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Stored as document "${doc.title}" (id: ${doc.id})`,
              },
            ],
            details: { id: doc.id, type: "document", title: doc.title },
          };
        }

        const entry = await deps.client.createEntry({
          title,
          content: params.content,
          type: type === "thought" ? "thought" : "entry",
          tags: params.tags,
          source: "openclaw-mind",
        });
        return {
          content: [
            { type: "text" as const, text: `Stored as ${type} "${entry.title ?? title}" (id: ${entry.id})` },
          ],
          details: { id: entry.id, type, title: entry.title ?? title },
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_add failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}

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
