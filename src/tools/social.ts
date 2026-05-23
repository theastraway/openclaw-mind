/**
 * mind_social — Social layer: thoughts, feed, communities.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const SocialParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("create_thought"),
      Type.Literal("get_thought"),
      Type.Literal("delete_thought"),
      Type.Literal("like_thought"),
      Type.Literal("feed"),
      Type.Literal("user_feed"),
      Type.Literal("search_feed"),
      Type.Literal("create_community"),
      Type.Literal("list_communities"),
      Type.Literal("get_community"),
      Type.Literal("join_community"),
      Type.Literal("leave_community"),
      Type.Literal("create_post"),
      Type.Literal("list_posts"),
    ],
    { description: "Social action — thoughts, feed browsing, community management." },
  ),
  thought_id: Type.Optional(Type.String({ description: "Thought ID for get/delete/like." })),
  community_id: Type.Optional(Type.String({ description: "Community ID for community actions and posts." })),
  post_id: Type.Optional(Type.String({ description: "Post ID for post actions." })),
  username: Type.Optional(Type.String({ description: "Username for user_feed." })),
  content: Type.Optional(Type.String({ description: "Content for thoughts or posts." })),
  name: Type.Optional(Type.String({ description: "Community name for create_community." })),
  description: Type.Optional(Type.String({ description: "Community description." })),
  query: Type.Optional(Type.String({ description: "Search query for search_feed." })),
  page: Type.Optional(Type.Number({ description: "Page number for paginated results." })),
  limit: Type.Optional(Type.Number({ description: "Max items per page." })),
});

type SocialParams = Static<typeof SocialParameters>;

export function createMindSocialTool(deps: ToolDeps) {
  return {
    name: "mind_social",
    label: "MIND Social",
    description:
      "Interact with MIND's social layer — create thoughts (posts), browse the feed, manage communities, engage with other users' content.",
    parameters: SocialParameters,
    async execute(_toolCallId: string, params: SocialParams) {
      try {
        switch (params.action) {
          case "create_thought": {
            if (!params.content) {
              return { content: [{ type: "text" as const, text: "'content' is required." }], details: { error: "missing_content" } };
            }
            const r = await deps.client.socialCreateThought(params.content);
            return { content: [{ type: "text" as const, text: `Thought posted (id: ${(r.id as string) ?? (r.thought_id as string) ?? "?"})` }], details: r };
          }
          case "get_thought": {
            if (!params.thought_id) return { content: [{ type: "text" as const, text: "'thought_id' is required." }], details: { error: "missing_thought_id" } };
            const r = await deps.client.socialGetThought(params.thought_id);
            return { content: [{ type: "text" as const, text: (r.content as string) ?? JSON.stringify(r) }], details: r };
          }
          case "delete_thought": {
            if (!params.thought_id) return { content: [{ type: "text" as const, text: "'thought_id' is required." }], details: { error: "missing_thought_id" } };
            await deps.client.socialDeleteThought(params.thought_id);
            return { content: [{ type: "text" as const, text: "Deleted." }], details: { ok: true } };
          }
          case "like_thought": {
            if (!params.thought_id) return { content: [{ type: "text" as const, text: "'thought_id' is required." }], details: { error: "missing_thought_id" } };
            await deps.client.socialLikeThought(params.thought_id);
            return { content: [{ type: "text" as const, text: "Liked." }], details: { ok: true } };
          }
          case "feed": {
            const r = await deps.client.socialFeed(params.page, params.limit);
            return { content: [{ type: "text" as const, text: `${r.thoughts?.length ?? 0} thought(s) in feed.` }], details: r };
          }
          case "user_feed": {
            if (!params.username) return { content: [{ type: "text" as const, text: "'username' is required." }], details: { error: "missing_username" } };
            const r = await deps.client.socialUserFeed(params.username, params.page, params.limit);
            return { content: [{ type: "text" as const, text: `${r.thoughts?.length ?? 0} thought(s) by ${params.username}.` }], details: r };
          }
          case "search_feed": {
            if (!params.query) return { content: [{ type: "text" as const, text: "'query' is required." }], details: { error: "missing_query" } };
            const r = await deps.client.socialSearchFeed(params.query, params.page, params.limit);
            return { content: [{ type: "text" as const, text: `${r.thoughts?.length ?? 0} match(es).` }], details: r };
          }
          case "create_community": {
            if (!params.name) return { content: [{ type: "text" as const, text: "'name' is required." }], details: { error: "missing_name" } };
            const r = await deps.client.socialCreateCommunity(params.name, params.description);
            return { content: [{ type: "text" as const, text: `Community "${params.name}" created.` }], details: r };
          }
          case "list_communities": {
            const r = await deps.client.socialListCommunities(params.page, params.limit);
            return { content: [{ type: "text" as const, text: `${r.communities?.length ?? 0} communit(ies).` }], details: r };
          }
          case "get_community": {
            if (!params.community_id) return { content: [{ type: "text" as const, text: "'community_id' is required." }], details: { error: "missing_community_id" } };
            const r = await deps.client.socialGetCommunity(params.community_id);
            return { content: [{ type: "text" as const, text: JSON.stringify(r) }], details: r };
          }
          case "join_community": {
            if (!params.community_id) return { content: [{ type: "text" as const, text: "'community_id' is required." }], details: { error: "missing_community_id" } };
            await deps.client.socialJoinCommunity(params.community_id);
            return { content: [{ type: "text" as const, text: "Joined." }], details: { ok: true } };
          }
          case "leave_community": {
            if (!params.community_id) return { content: [{ type: "text" as const, text: "'community_id' is required." }], details: { error: "missing_community_id" } };
            await deps.client.socialLeaveCommunity(params.community_id);
            return { content: [{ type: "text" as const, text: "Left." }], details: { ok: true } };
          }
          case "create_post": {
            if (!params.community_id || !params.content)
              return { content: [{ type: "text" as const, text: "'community_id' and 'content' are required." }], details: { error: "missing_params" } };
            const r = await deps.client.socialCreatePost(params.community_id, params.content);
            return { content: [{ type: "text" as const, text: `Post created.` }], details: r };
          }
          case "list_posts": {
            if (!params.community_id) return { content: [{ type: "text" as const, text: "'community_id' is required." }], details: { error: "missing_community_id" } };
            const r = await deps.client.socialListPosts(params.community_id, params.page, params.limit);
            return { content: [{ type: "text" as const, text: `${r.posts?.length ?? 0} post(s).` }], details: r };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_social failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
