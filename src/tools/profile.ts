/**
 * mind_profile — Manage profile, AI prompts, and model preferences.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const ProfileParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("get"),
      Type.Literal("update"),
      Type.Literal("get_chat_prompt"),
      Type.Literal("set_chat_prompt"),
      Type.Literal("get_thought_prompt"),
      Type.Literal("set_thought_prompt"),
      Type.Literal("get_model"),
      Type.Literal("set_model"),
      Type.Literal("list_models"),
    ],
    { description: "Action: get/update profile, get/set chat/thought prompts, get/set/list LLM models." },
  ),
  username: Type.Optional(Type.String({ description: "Username for get (defaults to current)." })),
  display_name: Type.Optional(Type.String({ description: "Display name for update." })),
  bio: Type.Optional(Type.String({ description: "Bio for update." })),
  prompt: Type.Optional(
    Type.String({ description: "System prompt content for set_chat_prompt / set_thought_prompt." }),
  ),
  model_id: Type.Optional(Type.String({ description: "Model ID for set_model." })),
});

type ProfileParams = Static<typeof ProfileParameters>;

export function createMindProfileTool(deps: ToolDeps) {
  return {
    name: "mind_profile",
    label: "MIND Profile",
    description:
      "Manage your MIND profile, AI prompt settings, and model preferences. Update bio, set custom system prompts for chat and thought generation, choose preferred LLM model.",
    parameters: ProfileParameters,
    async execute(_toolCallId: string, params: ProfileParams) {
      try {
        switch (params.action) {
          case "get": {
            const p = await deps.client.getProfile(params.username);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${p.username}${p.display_name ? ` (${p.display_name})` : ""}${p.bio ? `\n${p.bio}` : ""}`,
                },
              ],
              details: p,
            };
          }
          case "update": {
            const patch: Record<string, unknown> = {};
            if (params.display_name !== undefined) patch.display_name = params.display_name;
            if (params.bio !== undefined) patch.bio = params.bio;
            const p = await deps.client.updateProfile(patch);
            return {
              content: [{ type: "text" as const, text: `Profile updated.` }],
              details: p,
            };
          }
          case "get_chat_prompt": {
            const r = await deps.client.getChatPrompt();
            return { content: [{ type: "text" as const, text: r.prompt }], details: r };
          }
          case "set_chat_prompt": {
            if (!params.prompt) {
              return {
                content: [{ type: "text" as const, text: "'prompt' is required." }],
                details: { error: "missing_prompt" },
              };
            }
            await deps.client.setChatPrompt(params.prompt);
            return { content: [{ type: "text" as const, text: "Chat prompt updated." }], details: { ok: true } };
          }
          case "get_thought_prompt": {
            const r = await deps.client.getThoughtPrompt();
            return { content: [{ type: "text" as const, text: r.prompt }], details: r };
          }
          case "set_thought_prompt": {
            if (!params.prompt) {
              return {
                content: [{ type: "text" as const, text: "'prompt' is required." }],
                details: { error: "missing_prompt" },
              };
            }
            await deps.client.setThoughtPrompt(params.prompt);
            return { content: [{ type: "text" as const, text: "Thought prompt updated." }], details: { ok: true } };
          }
          case "get_model": {
            const m = await deps.client.getModel();
            return {
              content: [{ type: "text" as const, text: `Current model: ${JSON.stringify(m)}` }],
              details: m,
            };
          }
          case "set_model": {
            if (!params.model_id) {
              return {
                content: [{ type: "text" as const, text: "'model_id' is required." }],
                details: { error: "missing_model_id" },
              };
            }
            const m = await deps.client.setModel(params.model_id);
            return {
              content: [{ type: "text" as const, text: `Model set to ${params.model_id}.` }],
              details: m,
            };
          }
          case "list_models": {
            const r = await deps.client.listModels();
            const list = (r.models ?? []).slice(0, 50).map((m) => `• ${(m.id as string) ?? (m.name as string)}`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${r.models?.length ?? 0} model(s) available:\n${list.join("\n")}`,
                },
              ],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_profile failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
