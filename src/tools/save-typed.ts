/**
 * mind_save_typed — Save a Front Layer typed document.
 *
 * Wraps document creation with the canonical `front-layer-<type>` source
 * tag so retrieval can filter by it later. Use this for any SOUL / IDENTITY
 * / BELIEFS / USER / BEHAVIOR / LESSON / POLICY / etc. document.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const SaveTypedParameters = Type.Object({
  type: Type.String({
    description:
      "Front Layer type — must match one of the 16 canonical types (SOUL, IDENTITY, BELIEFS, USER, AGENTS, TOOLS, SENSES, SKILLS, BEHAVIOR, LESSON, DECISION, POLICY, WORKFLOW, PREFERENCE, GOAL, RELATIONSHIP).",
  }),
  title: Type.String({ description: "Short, human-readable title for the document." }),
  content: Type.String({
    description: "Full markdown body including the frontmatter (---type, id, slots, ---) and content.",
  }),
});

type SaveTypedParams = Static<typeof SaveTypedParameters>;

export function createMindSaveTypedTool(deps: ToolDeps) {
  return {
    name: "mind_save_typed",
    label: "MIND Save Typed",
    description:
      "Save a filled-out Front Layer document with the proper type tag so retrieval can filter by it later. Wraps mind document creation and pre-bakes the source tag (`front-layer-<type>`). Use this — not raw mind_remember — for any SOUL / IDENTITY / BELIEFS / USER / BEHAVIOR / LESSON / POLICY / etc. document.",
    parameters: SaveTypedParameters,
    async execute(_toolCallId: string, params: SaveTypedParams) {
      try {
        const doc = await deps.client.saveTypedDocument(params.type, params.title, params.content);
        return {
          content: [
            { type: "text" as const, text: `Saved typed document "${doc.title}" (type: ${params.type}, id: ${doc.id})` },
          ],
          details: doc,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_save_typed failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
