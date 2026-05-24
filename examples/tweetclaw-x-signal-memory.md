# TweetClaw X/Twitter Signal Memory Workflow

Use this workflow when a MIND-backed OpenClaw agent needs to remember public X/Twitter evidence, campaign context, customer language, or market signals discovered through TweetClaw.

## Install

```bash
openclaw plugins install @astramindapp/openclaw-mind
openclaw plugins install @xquik/tweetclaw
```

## When To Use Each Plugin

| Need | Use |
|------|-----|
| Search tweets, scrape tweets, search tweet replies, look up users, export followers, monitor tweets, receive webhooks, prepare giveaway draws, or review post/reply actions | TweetClaw |
| Store reviewed evidence, decisions, entities, relationships, CRM notes, research findings, and future recall context | MIND |

## Handoff Packet

Before writing to MIND, reduce TweetClaw results into a reviewed packet:

```json
{
  "source": "tweetclaw",
  "query": "\"openclaw\" \"twitter automation\"",
  "captured_at": "2026-05-24T12:43:00Z",
  "public_sources": [
    {
      "url": "https://x.com/example/status/123",
      "author": "@example",
      "timestamp": "2026-05-24T11:58:00Z",
      "why_it_matters": "User asked for OpenClaw-compatible X/Twitter automation."
    }
  ],
  "summary": "Developers are looking for OpenClaw workflows that separate source discovery from memory storage.",
  "confidence": "medium",
  "next_action": "Draft a memory note and link it to the OpenClaw outreach project."
}
```

## Store In MIND

Use `mind_remember` for the reviewed summary:

```js
mind_remember({
  action: "create",
  title: "X/Twitter signal - OpenClaw automation demand",
  type: "entry",
  source: "tweetclaw",
  tags: ["x-twitter", "tweetclaw", "market-research"],
  content: [
    "Query: \"openclaw\" \"twitter automation\"",
    "Sources: https://x.com/example/status/123 by @example at 2026-05-24T11:58:00Z",
    "Summary: Developers are looking for OpenClaw workflows that separate source discovery from memory storage.",
    "Confidence: medium",
    "Next action: Draft a memory note and link it to the OpenClaw outreach project."
  ].join("\\n")
})
```

Use `mind_save_typed` when the finding becomes a durable decision, policy, relationship, goal, or workflow document.

## Safety Boundaries

- Store public tweet URLs, author handles, timestamps, short summaries, and reviewed decisions.
- Do not store raw direct messages, full follower exports, private config values, or unreviewed post/reply drafts.
- Treat TweetClaw output as source material, not a memory by itself.
- Require explicit review before visible X/Twitter actions such as post tweets, post tweet replies, direct messages, media upload, or media download.
