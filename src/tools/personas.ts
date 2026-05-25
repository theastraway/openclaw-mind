/**
 * mind_personas — Influencer Factory Command Center (admin-only).
 *
 * Phase 1 surface mirrors @astramindapp/mcp-server v0.15.x:
 *   - persona CRUD (each persona is 1:1 with a featured_minds row)
 *   - face anchor (AI-generate via Nano Banana Pro)
 *   - face variants (i2i via n8n + Fal.ai, always pinned to anchor)
 *   - voice library + clone + sample (ElevenLabs)
 *   - per-platform bios (with LLM drafter)
 *   - Blotato account registration (6 platforms + TikTok manual-upload)
 *
 * Whole router is dark on the server unless IF_FEATURE_FLAG_ENABLED=true.
 * Requires an admin-scoped MIND API key.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const PersonasParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("health"),
      Type.Literal("list_personas"),
      Type.Literal("get_persona"),
      Type.Literal("create_persona"),
      Type.Literal("update_persona"),
      Type.Literal("delete_persona"),
      Type.Literal("anchor_face_ai_generate"),
      Type.Literal("request_face_variants"),
      Type.Literal("list_face_variants"),
      Type.Literal("search_voice_library"),
      Type.Literal("set_voice_library"),
      Type.Literal("generate_voice_sample"),
      Type.Literal("update_bios"),
      Type.Literal("blotato_whoami"),
      Type.Literal("blotato_accounts"),
      Type.Literal("register_blotato_account"),
      Type.Literal("unregister_blotato_account"),
    ],
    {
      description:
        "What to do. Start with 'health' to confirm Fal/ElevenLabs/Blotato/S3/n8n are configured. Per-persona actions need persona_mind_id.",
    },
  ),
  persona_mind_id: Type.Optional(
    Type.String({
      description: "Persona id (== featured_minds.mind_id). Required for every per-persona action.",
    }),
  ),

  // create_persona
  username: Type.Optional(
    Type.String({
      description: "Lowercase username (3-32 chars). Drives /m/{username} + featured_minds row.",
    }),
  ),
  display_name: Type.Optional(Type.String({ description: "Display name (required for create_persona)." })),
  niche: Type.Optional(Type.String({ description: "Niche label, e.g. 'fitness'." })),
  pillars: Type.Optional(Type.Array(Type.String(), { description: "3-5 content pillars." })),
  tone: Type.Optional(Type.String({ description: "Tone descriptor, e.g. 'warm-direct'." })),
  archetype_id: Type.Optional(Type.String({ description: "Persona archetype template id." })),
  kg_scope_template_id: Type.Optional(
    Type.String({ description: "Knowledge-graph scope template id (bounds persona knowledge)." }),
  ),
  niche_tags: Type.Optional(Type.Array(Type.String(), { description: "Topic niche tags." })),
  daily_credit_ceiling_usd: Type.Optional(
    Type.Number({
      description: "Hard ceiling on daily Fal/ElevenLabs/Veo spend per persona. Default 5.",
    }),
  ),

  // update_persona — partial
  status: Type.Optional(
    Type.Union(
      [Type.Literal("draft"), Type.Literal("active"), Type.Literal("paused")],
      { description: "Persona runtime status." },
    ),
  ),
  agent_posting_enabled: Type.Optional(
    Type.Boolean({
      description: "Master kill-switch on the linked Featured MIND row. Off = posters skip persona.",
    }),
  ),

  // anchor_face_ai_generate / generate_voice_sample
  prompt: Type.Optional(
    Type.String({
      description:
        "Anchor-face generation prompt (anchor_face_ai_generate). Use voice_text for TTS sample text.",
    }),
  ),
  model: Type.Optional(
    Type.Union([Type.Literal("nano_banana_pro"), Type.Literal("flux")], {
      description: "Anchor-face generator model. Default nano_banana_pro.",
    }),
  ),

  // request_face_variants
  count: Type.Optional(Type.Number({ description: "Variant count (1-20). Default 5." })),
  prompt_modifier: Type.Optional(Type.String({ description: "Optional modifier appended to variant prompt." })),

  // voice
  voice_query: Type.Optional(Type.String({ description: "ElevenLabs library search query." })),
  voice_id: Type.Optional(Type.String({ description: "ElevenLabs voice id (set_voice_library)." })),
  voice_name: Type.Optional(Type.String({ description: "Display name to store with voice." })),
  voice_text: Type.Optional(Type.String({ description: "Text to render as a sample MP3." })),

  // bios
  bios: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description:
        "Map of platform → bio (twitter|instagram|tiktok|linkedin|youtube|threads|pinterest). Length-capped server-side.",
    }),
  ),
  generate_with_llm: Type.Optional(
    Type.Boolean({ description: "LLM drafts missing platform bios. Existing bios stay." }),
  ),

  // blotato
  platform: Type.Optional(
    Type.Union(
      [
        Type.Literal("twitter"),
        Type.Literal("instagram"),
        Type.Literal("tiktok"),
        Type.Literal("linkedin"),
        Type.Literal("youtube"),
        Type.Literal("threads"),
        Type.Literal("pinterest"),
      ],
      { description: "Target platform for Blotato register/unregister." },
    ),
  ),
  account_id: Type.Optional(Type.String({ description: "Blotato account id (from accounts list)." })),
  page_id: Type.Optional(Type.String({ description: "LinkedIn / IG / YouTube page id (optional)." })),
  board_id: Type.Optional(Type.String({ description: "Pinterest board id (REQUIRED for Pinterest)." })),
  handle: Type.Optional(Type.String({ description: "Display handle (optional)." })),
  media_type: Type.Optional(
    Type.Union([Type.Literal("story"), Type.Literal("reel")], {
      description: "Instagram media type.",
    }),
  ),

  // list filters
  search: Type.Optional(Type.String({ description: "Search filter for list_personas." })),
});

type PersonasParams = Static<typeof PersonasParameters>;

export function createMindPersonasTool(deps: ToolDeps) {
  return {
    name: "mind_personas",
    label: "MIND Personas (Influencer Factory)",
    description:
      "Influencer Factory Command Center — admin-only synthetic-persona fleet. Each persona is a Featured MIND row (1:1) plus an asset library (face anchor + variants, voice, bios, Blotato accounts). Phase 1 surface: persona CRUD, anchor (AI-generate via Nano Banana Pro), variants (i2i via n8n + Fal.ai, always pinned to anchor — never chained), voice (ElevenLabs library + clone + sample), per-platform bios with LLM drafter, Blotato register/unregister (YouTube/IG/LinkedIn/X/Threads/Pinterest; TikTok marked manual_upload). Each persona is publicly chattable at /m/{username} via its linked Featured MIND. Requires admin API key + IF_FEATURE_FLAG_ENABLED=true on server.",
    parameters: PersonasParameters,
    async execute(_toolCallId: string, params: PersonasParams) {
      try {
        const pid = params.persona_mind_id as string | undefined;
        const need = () => {
          if (!pid) throw new Error(`${params.action} requires persona_mind_id`);
        };

        switch (params.action) {
          case "health": {
            const r = await deps.client.ifHealth();
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "list_personas": {
            const r = await deps.client.ifListPersonas({
              status: params.status,
              search: params.search,
            });
            const lines = r.length
              ? r.map((p: any) => `• @${p.username} — ${p.display_name} [${p.status}] (${p.persona_mind_id})`)
              : ["No personas."];
            return { content: [{ type: "text" as const, text: lines.join("\n") }], details: r };
          }
          case "get_persona": {
            need();
            const r = await deps.client.ifGetPersonaFull(pid!);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "create_persona": {
            if (!params.username || !params.display_name)
              throw new Error("username and display_name are required");
            const r = await deps.client.ifCreatePersona({
              username: params.username,
              display_name: params.display_name,
              niche: params.niche,
              pillars: params.pillars,
              tone: params.tone,
              archetype_id: params.archetype_id,
              kg_scope_template_id: params.kg_scope_template_id,
              niche_tags: params.niche_tags,
              daily_credit_ceiling_usd: params.daily_credit_ceiling_usd,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Created persona @${(r as any).username} (mind_id=${(r as any).persona_mind_id})`,
                },
              ],
              details: r,
            };
          }
          case "update_persona": {
            need();
            const patch: Record<string, unknown> = {};
            if (params.display_name !== undefined) patch.display_name = params.display_name;
            if (params.niche !== undefined) patch.niche = params.niche;
            if (params.pillars !== undefined) patch.pillars = params.pillars;
            if (params.tone !== undefined) patch.tone = params.tone;
            if (params.daily_credit_ceiling_usd !== undefined)
              patch.daily_credit_ceiling_usd = params.daily_credit_ceiling_usd;
            if (params.status !== undefined) patch.status = params.status;
            if (params.archetype_id !== undefined) patch.archetype_id = params.archetype_id;
            if (params.kg_scope_template_id !== undefined)
              patch.kg_scope_template_id = params.kg_scope_template_id;
            if (params.niche_tags !== undefined) patch.niche_tags = params.niche_tags;
            if (params.agent_posting_enabled !== undefined)
              patch.agent_posting_enabled = params.agent_posting_enabled;
            const r = await deps.client.ifUpdatePersona(pid!, patch);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "delete_persona": {
            need();
            const r = await deps.client.ifDeletePersona(pid!);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "anchor_face_ai_generate": {
            need();
            if (!params.prompt) throw new Error("prompt is required");
            const r = await deps.client.ifAnchorAIGenerate(pid!, {
              prompt: params.prompt,
              model: params.model,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "request_face_variants": {
            need();
            const r = await deps.client.ifRequestVariants(pid!, {
              count: params.count ?? 5,
              prompt_modifier: params.prompt_modifier,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "list_face_variants": {
            need();
            const r = await deps.client.ifListVariants(pid!);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "search_voice_library": {
            const r = await deps.client.ifSearchVoiceLibrary({ q: params.voice_query });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "set_voice_library": {
            need();
            if (!params.voice_id) throw new Error("voice_id is required");
            const r = await deps.client.ifSetVoiceLibrary(pid!, {
              voice_id: params.voice_id,
              name: params.voice_name,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "generate_voice_sample": {
            need();
            if (!params.voice_text) throw new Error("voice_text is required");
            const r = await deps.client.ifVoiceSample(pid!, params.voice_text);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "update_bios": {
            need();
            const r = await deps.client.ifUpdateBios(pid!, {
              bios: params.bios ?? {},
              generate_with_llm: params.generate_with_llm,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "blotato_whoami": {
            const r = await deps.client.ifBlotatoWhoami();
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "blotato_accounts": {
            const r = await deps.client.ifBlotatoAccounts();
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "register_blotato_account": {
            need();
            if (!params.platform || !params.account_id)
              throw new Error("platform and account_id are required");
            const r = await deps.client.ifRegisterBlotato(pid!, params.platform, {
              account_id: params.account_id,
              page_id: params.page_id,
              board_id: params.board_id,
              handle: params.handle,
              media_type: params.media_type,
            });
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          case "unregister_blotato_account": {
            need();
            if (!params.platform) throw new Error("platform is required");
            const r = await deps.client.ifUnregisterBlotato(pid!, params.platform);
            return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }], details: r };
          }
          default:
            throw new Error(`Unknown action: ${params.action}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_personas failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
