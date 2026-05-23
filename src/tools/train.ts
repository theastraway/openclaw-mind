/**
 * mind_train — Guided self-training sessions.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const TrainParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("start"),
      Type.Literal("chat"),
      Type.Literal("status"),
      Type.Literal("list_sessions"),
      Type.Literal("pause"),
      Type.Literal("resume"),
      Type.Literal("save_chat"),
    ],
    { description: "Action: start, chat, status, list_sessions, pause, resume, save_chat." },
  ),
  session_type: Type.Optional(
    Type.String({ description: "Training type: basics, network, expertise, history, goals, freeform." }),
  ),
  message: Type.Optional(Type.String({ description: "Training message for chat." })),
  session_id: Type.Optional(Type.String({ description: "Session ID for save_chat." })),
});

type TrainParams = Static<typeof TrainParameters>;

export function createMindTrainTool(deps: ToolDeps) {
  return {
    name: "mind_train",
    label: "MIND Train",
    description:
      "Train MIND's knowledge graph. Start guided training sessions to teach it about yourself, or save existing chat conversations into the KG for persistent memory.",
    parameters: TrainParameters,
    async execute(_toolCallId: string, params: TrainParams) {
      try {
        switch (params.action) {
          case "start": {
            const r = await deps.client.trainingStart(params.session_type);
            return {
              content: [{ type: "text" as const, text: `Training session started.` }],
              details: r,
            };
          }
          case "chat": {
            if (!params.message) {
              return {
                content: [{ type: "text" as const, text: "'message' is required for chat." }],
                details: { error: "missing_message" },
              };
            }
            const r = await deps.client.trainingChat(params.message);
            return {
              content: [{ type: "text" as const, text: (r.response as string) ?? JSON.stringify(r) }],
              details: r,
            };
          }
          case "status": {
            const r = await deps.client.trainingStatus();
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "list_sessions": {
            const r = await deps.client.trainingSessions();
            return {
              content: [{ type: "text" as const, text: `${r.sessions?.length ?? 0} session(s).` }],
              details: r,
            };
          }
          case "pause": {
            await deps.client.trainingPause();
            return { content: [{ type: "text" as const, text: "Paused." }], details: { ok: true } };
          }
          case "resume": {
            const r = await deps.client.trainingResume();
            return { content: [{ type: "text" as const, text: "Resumed." }], details: r };
          }
          case "save_chat": {
            if (!params.session_id) {
              return {
                content: [{ type: "text" as const, text: "'session_id' is required." }],
                details: { error: "missing_session_id" },
              };
            }
            const r = await deps.client.saveChatToMind(params.session_id);
            return {
              content: [{ type: "text" as const, text: "Chat session saved to MIND." }],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_train failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
