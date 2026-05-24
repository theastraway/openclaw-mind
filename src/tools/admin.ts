/**
 * mind_admin — Admin-only user + featured-mind management.
 *
 * Requires an admin-scoped MIND API key. Calls 403 with a non-admin key.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const AdminParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("create_user"),
      Type.Literal("create_featured_mind"),
      Type.Literal("list_featured_minds"),
      Type.Literal("get_featured_mind_full"),
      Type.Literal("update_featured_mind"),
      Type.Literal("update_featured_mind_owner_profile"),
      Type.Literal("reorder_featured_minds"),
      Type.Literal("delete_featured_mind"),
      Type.Literal("list_users"),
      Type.Literal("update_user_tier"),
      Type.Literal("adjust_user_credits"),
    ],
    { description: "Admin action. Featured Minds Portal full CRUD: create_featured_mind, list_featured_minds, get_featured_mind_full (bundled view), update_featured_mind (catalog), update_featured_mind_owner_profile (write-through to user_profiles: model, public chat prompt, temperature, brand fields), reorder_featured_minds, delete_featured_mind." },
  ),
  // create_user
  username: Type.Optional(Type.String({ description: "Username (3-30 chars, letters/numbers/underscores)." })),
  email: Type.Optional(Type.String()),
  password: Type.Optional(Type.String({ description: "Password (min 8 chars)." })),
  source: Type.Optional(Type.String({ description: "Source app/partner that created this user." })),
  tier: Type.Optional(Type.String({ description: "Subscription tier: free, pro, enterprise." })),
  generate_api_key: Type.Optional(Type.Boolean({ description: "Also generate a developer API key." })),
  api_key_name: Type.Optional(Type.String({ description: "Name for generated API key." })),
  // featured minds — catalog
  mind_id: Type.Optional(Type.String({ description: "Featured-mind id (required for get/update/delete actions)." })),
  title: Type.Optional(Type.String({ description: "Featured-mind title." })),
  subtitle: Type.Optional(Type.String({ description: "One-line hook shown under the title (≤140 chars)." })),
  description: Type.Optional(Type.String({ description: "Featured-mind description." })),
  tags: Type.Optional(Type.Array(Type.String())),
  price: Type.Optional(Type.Number()),
  featured: Type.Optional(Type.Boolean()),
  display_order: Type.Optional(Type.Number()),
  is_public: Type.Optional(Type.Boolean()),
  avatar_url: Type.Optional(Type.String({ description: "S3-hosted avatar URL." })),
  banner_url: Type.Optional(Type.String({ description: "S3-hosted banner URL." })),
  // featured minds — owner_profile write-through
  preferred_llm_model: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "LLM model id used by the public chat (e.g. 'openai/gpt-4o'). Pass null to clear and fall back to platform default.",
    }),
  ),
  public_mind_enabled: Type.Optional(Type.Boolean({ description: "Anonymous visitors can chat at /m/{username}." })),
  public_mind_prompt: Type.Optional(Type.String({ description: "System prompt for public chat (≤3000 chars)." })),
  public_mind_tagline: Type.Optional(Type.String({ description: "Public landing tagline (≤160 chars)." })),
  public_mind_greeting: Type.Optional(Type.String({ description: "Public landing greeting (≤500 chars)." })),
  public_mind_persona: Type.Optional(Type.String({ description: "Persona description used by the auto-built default prompt (≤800 chars)." })),
  chat_temperature: Type.Optional(
    Type.Union([Type.Number({ minimum: 0, maximum: 2 }), Type.Null()], {
      description: "Per-MIND temperature override (0.0–2.0). Null clears.",
    }),
  ),
  chat_reasoning_effort: Type.Optional(
    Type.Union(
      [
        Type.Literal("minimal"),
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Null(),
      ],
      { description: "Per-MIND reasoning_effort override (thinking models only)." },
    ),
  ),
  bio: Type.Optional(Type.String({ description: "Owner bio (≤500 chars)." })),
  // Influencer Factory fields (writable via create_featured_mind + update_featured_mind)
  archetype_id: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "Influencer Factory: archetype persona id. Pass null to clear.",
    }),
  ),
  voice_id: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "Influencer Factory: ElevenLabs voice id used by this persona. Pass null to clear.",
    }),
  ),
  seed_image_url: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "Influencer Factory: anchor seed image URL (image-to-image variants pin to this; don't chain). Pass null to clear.",
    }),
  ),
  niche_tags: Type.Optional(
    Type.Array(Type.String(), {
      description: "Influencer Factory: niche/topic tags (separate from catalog `tags`).",
    }),
  ),
  kg_scope_template_id: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "Influencer Factory: KG-scope template id bounding what this persona knows/talks about. Pass null to clear.",
    }),
  ),
  agent_posting_enabled: Type.Optional(
    Type.Boolean({
      description: "Influencer Factory: gate that lets autonomous agents post on this persona's behalf. Dark by default.",
    }),
  ),
  // reorder
  ordered_mind_ids: Type.Optional(
    Type.Array(Type.String(), { description: "Full ordered list of mind_ids — index becomes display_order." }),
  ),
  // list users
  query: Type.Optional(Type.String({ description: "Search query for list_users." })),
  page: Type.Optional(Type.Number()),
  // adjust credits
  credits: Type.Optional(Type.Number({ description: "Credits to add (+) or deduct (-)." })),
});

type AdminParams = Static<typeof AdminParameters>;

export function createMindAdminTool(deps: ToolDeps) {
  return {
    name: "mind_admin",
    label: "MIND Admin",
    description:
      "Admin-only tool for managing MIND users and featured minds. Requires an admin API key. Use to create new user accounts, provision featured minds, list users, and manage the featured-minds catalog.",
    parameters: AdminParameters,
    async execute(_toolCallId: string, params: AdminParams) {
      try {
        switch (params.action) {
          case "create_user": {
            if (!params.username || !params.email || !params.password) {
              return {
                content: [{ type: "text" as const, text: "'username', 'email', and 'password' are required." }],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.adminCreateUser({
              username: params.username,
              email: params.email,
              password: params.password,
              source: params.source,
              tier: params.tier,
              generate_api_key: params.generate_api_key,
              api_key_name: params.api_key_name,
            });
            const apiNote = r.api_key ? `\nAPI key: ${r.api_key.key} (prefix: ${r.api_key.prefix})` : "";
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Created user ${r.user.username} <${r.user.email}> — tier: ${r.user.tier}${apiNote}`,
                },
              ],
              details: r,
            };
          }
          case "create_featured_mind": {
            if (!params.username || !params.title) {
              return {
                content: [{ type: "text" as const, text: "'username' and 'title' are required." }],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.adminCreateFeaturedMind({
              username: params.username,
              title: params.title,
              subtitle: params.subtitle,
              description: params.description,
              tags: params.tags,
              price: params.price,
              featured: params.featured,
              display_order: params.display_order,
              is_public: params.is_public,
              avatar_url: params.avatar_url,
              banner_url: params.banner_url,
              // Influencer Factory extensions
              archetype_id: params.archetype_id,
              voice_id: params.voice_id,
              seed_image_url: params.seed_image_url,
              niche_tags: params.niche_tags,
              kg_scope_template_id: params.kg_scope_template_id,
              agent_posting_enabled: params.agent_posting_enabled,
            });
            return {
              content: [{ type: "text" as const, text: `Created featured mind "${r.title}" (id: ${r.mind_id})` }],
              details: r,
            };
          }
          case "list_featured_minds": {
            const r = await deps.client.adminListFeaturedMinds();
            const lines = r.map(
              (m) => `• ${m.featured ? "★ " : "  "}${m.title} (${m.username}) — order ${m.display_order}`,
            );
            return {
              content: [{ type: "text" as const, text: `${r.length} featured mind(s):\n${lines.join("\n")}` }],
              details: r,
            };
          }
          case "update_featured_mind": {
            if (!params.mind_id) {
              return {
                content: [{ type: "text" as const, text: "'mind_id' is required." }],
                details: { error: "missing_mind_id" },
              };
            }
            const patch: Record<string, unknown> = {};
            if (params.title !== undefined) patch.title = params.title;
            if (params.subtitle !== undefined) patch.subtitle = params.subtitle;
            if (params.description !== undefined) patch.description = params.description;
            if (params.tags !== undefined) patch.tags = params.tags;
            if (params.price !== undefined) patch.price = params.price;
            if (params.featured !== undefined) patch.featured = params.featured;
            if (params.display_order !== undefined) patch.display_order = params.display_order;
            if (params.is_public !== undefined) patch.is_public = params.is_public;
            if (params.avatar_url !== undefined) patch.avatar_url = params.avatar_url;
            if (params.banner_url !== undefined) patch.banner_url = params.banner_url;
            // Influencer Factory fields
            if (params.archetype_id !== undefined) patch.archetype_id = params.archetype_id;
            if (params.voice_id !== undefined) patch.voice_id = params.voice_id;
            if (params.seed_image_url !== undefined) patch.seed_image_url = params.seed_image_url;
            if (params.niche_tags !== undefined) patch.niche_tags = params.niche_tags;
            if (params.kg_scope_template_id !== undefined) patch.kg_scope_template_id = params.kg_scope_template_id;
            if (params.agent_posting_enabled !== undefined) patch.agent_posting_enabled = params.agent_posting_enabled;
            const r = await deps.client.adminUpdateFeaturedMind(params.mind_id, patch);
            return {
              content: [{ type: "text" as const, text: `Updated featured mind "${r.title}"` }],
              details: r,
            };
          }
          case "get_featured_mind_full": {
            if (!params.mind_id) {
              return {
                content: [{ type: "text" as const, text: "'mind_id' is required." }],
                details: { error: "missing_mind_id" },
              };
            }
            const full = await deps.client.adminGetFeaturedMindFull(params.mind_id);
            const op = full.owner_profile;
            const fm = full.featured_mind;
            const lines = [
              `Featured mind "${fm.title}" (id: ${fm.mind_id}, order: ${fm.display_order}, featured: ${fm.featured}, public: ${fm.is_public ?? false})`,
              ``,
              `Owner profile (write-through target):`,
              `  @${op.username}`,
              `  preferred_llm_model: ${op.preferred_llm_model ?? "(platform default)"}`,
              `  public_mind_enabled: ${op.public_mind_enabled}`,
              `  public_mind_prompt: ${op.public_mind_prompt ? `${op.public_mind_prompt.slice(0, 80)}${op.public_mind_prompt.length > 80 ? "…" : ""}` : "(default)"}`,
              `  tagline: ${op.public_mind_tagline || "—"}`,
              `  greeting: ${op.public_mind_greeting ? op.public_mind_greeting.slice(0, 60) + (op.public_mind_greeting.length > 60 ? "…" : "") : "—"}`,
              `  persona: ${op.public_mind_persona ? op.public_mind_persona.slice(0, 60) + (op.public_mind_persona.length > 60 ? "…" : "") : "—"}`,
              `  temperature: ${op.chat_temperature ?? "(default)"}`,
              `  reasoning_effort: ${op.chat_reasoning_effort ?? "(default)"}`,
              `  avatar_url: ${op.avatar_url ? "✓ set" : "—"}`,
              `  banner_url: ${op.banner_url ? "✓ set" : "—"}`,
              ``,
              `Available models: ${full.available_models.length} total`,
            ];
            return {
              content: [{ type: "text" as const, text: lines.join("\n") }],
              details: full,
            };
          }
          case "update_featured_mind_owner_profile": {
            if (!params.mind_id) {
              return {
                content: [{ type: "text" as const, text: "'mind_id' is required." }],
                details: { error: "missing_mind_id" },
              };
            }
            const patch: Parameters<typeof deps.client.adminUpdateFeaturedMindOwnerProfile>[1] = {};
            if (params.preferred_llm_model !== undefined) patch.preferred_llm_model = params.preferred_llm_model;
            if (params.public_mind_enabled !== undefined) patch.public_mind_enabled = params.public_mind_enabled;
            if (params.public_mind_prompt !== undefined) patch.public_mind_prompt = params.public_mind_prompt;
            if (params.public_mind_tagline !== undefined) patch.public_mind_tagline = params.public_mind_tagline;
            if (params.public_mind_greeting !== undefined) patch.public_mind_greeting = params.public_mind_greeting;
            if (params.public_mind_persona !== undefined) patch.public_mind_persona = params.public_mind_persona;
            if (params.chat_temperature !== undefined) patch.chat_temperature = params.chat_temperature;
            if (params.chat_reasoning_effort !== undefined) patch.chat_reasoning_effort = params.chat_reasoning_effort;
            if (params.bio !== undefined) patch.bio = params.bio;
            if (params.avatar_url !== undefined) patch.avatar_url = params.avatar_url;
            if (params.banner_url !== undefined) patch.banner_url = params.banner_url;
            if (Object.keys(patch).length === 0) {
              return {
                content: [{ type: "text" as const, text: "Nothing to update — pass at least one owner_profile field." }],
                details: { error: "empty_patch" },
              };
            }
            const r = await deps.client.adminUpdateFeaturedMindOwnerProfile(params.mind_id, patch);
            const changed = Object.keys(patch).join(", ");
            return {
              content: [{ type: "text" as const, text: `Owner-profile write-through for @${r.username}: ${changed}` }],
              details: r,
            };
          }
          case "reorder_featured_minds": {
            if (!params.ordered_mind_ids || params.ordered_mind_ids.length === 0) {
              return {
                content: [{ type: "text" as const, text: "'ordered_mind_ids' (full ordered list) is required." }],
                details: { error: "missing_ordered_mind_ids" },
              };
            }
            const r = await deps.client.adminReorderFeaturedMinds(params.ordered_mind_ids);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Reordered ${r.total} featured mind(s) — ${r.updated} display_order value(s) changed.`,
                },
              ],
              details: r,
            };
          }
          case "delete_featured_mind": {
            if (!params.mind_id) {
              return {
                content: [{ type: "text" as const, text: "'mind_id' is required." }],
                details: { error: "missing_mind_id" },
              };
            }
            const r = await deps.client.adminDeleteFeaturedMind(params.mind_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Featured mind removed (${r.status}). The user's underlying MIND is not deleted.`,
                },
              ],
              details: r,
            };
          }
          case "list_users": {
            const r = await deps.client.adminListUsers({ q: params.query, page: params.page });
            const lines = (r.users ?? []).map(
              (u) => `• ${u.username}${u.email ? ` <${u.email}>` : ""} — tier: ${u.tier ?? "?"}, docs: ${u.doc_count ?? 0}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: lines.length ? `${r.total ?? r.users.length} user(s):\n${lines.join("\n")}` : "No users.",
                },
              ],
              details: r,
            };
          }
          case "update_user_tier": {
            if (!params.username || !params.tier) {
              return {
                content: [{ type: "text" as const, text: "'username' and 'tier' are required." }],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.adminUpdateUserTier(params.username, params.tier);
            return {
              content: [{ type: "text" as const, text: `Set ${params.username} to ${r.tier}.` }],
              details: r,
            };
          }
          case "adjust_user_credits": {
            if (!params.username || params.credits === undefined) {
              return {
                content: [{ type: "text" as const, text: "'username' and 'credits' are required." }],
                details: { error: "missing_params" },
              };
            }
            const r = await deps.client.adminAdjustCredits(params.username, params.credits);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Adjusted ${params.username} by ${params.credits >= 0 ? "+" : ""}${params.credits} — new balance: ${r.new_balance}`,
                },
              ],
              details: r,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_admin failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
