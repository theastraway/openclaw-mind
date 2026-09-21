# @astramindapp/openclaw-mind

**MIND personal knowledge graph for OpenClaw.** 28 tools, 4 skills, full lifecycle hooks. The most complete memory plugin for AI agents — canonical parity with `@astramindapp/mcp-server`.

Other memory plugins store text. **MIND understands it.**

```bash
openclaw plugins install @astramindapp/openclaw-mind
```

## What MIND Adds to OpenClaw

- **True knowledge graph** — Every memory becomes entities + relationships, not flat text
- **50+ AI models** — Switch between GPT, Claude, Gemini, Llama, DeepSeek, Grok mid-conversation
- **MINDsense emotional intelligence** *(patent-pending)* — Valence + arousal weighting determines encoding depth, mirroring biological memory
- **Autonomous learning** — 8 pattern detectors run daily on your KG, surface insights you didn't ask for
- **Life management** — Goals, projects, tasks, calendar, all synced from agent conversations
- **CRM** — Contacts and interaction history captured automatically
- **Agent Sessions** — This agent's own live session auto-syncs into **MIND Chat → Agents** (open on first turn, append every turn, close on shutdown/idle) — no setup, no tool calls required. The owner reads the transcript there and can reply; the reply reaches the agent as `pending_replies` on its next turn.
- **Cross-agent** — Memories shared across every OpenClaw agent, MCP client, and the MIND web app

## Why Not Just Use Mem0 or Another Memory Plugin?

| Feature | MIND | Mem0 | Anthropic Memory MCP |
|---------|------|------|----------------------|
| Tools | **28** | 8 | 8 |
| Knowledge graph | ✅ true KG | ❌ vectors only | ❌ JSON |
| 50+ AI models | ✅ | ❌ provider-agnostic but no UI | ❌ Claude only |
| Emotional intelligence | ✅ MINDsense (patent-pending) | ❌ | ❌ |
| Auto-recall before turn | ✅ | ✅ | ❌ |
| Auto-capture after turn | ✅ | ✅ | ❌ |
| Live agent session in a chat UI | ✅ Agent Sessions, auto-synced | ❌ | ❌ |
| Graph traversal queries | ✅ | ❌ | ❌ |
| Life management | ✅ | ❌ | ❌ |
| CRM | ✅ | ❌ | ❌ |
| Mobile app | ✅ | ❌ | ❌ |
| Free tier | ✅ 50 credits/mo | ✅ 10K memories/mo | ✅ |

## Quick Start

### 1. Install

```bash
openclaw plugins install @astramindapp/openclaw-mind
```

### 2. Get a MIND API key

Sign up at [m-i-n-d.ai](https://www.m-i-n-d.ai) → Settings → Developer → Create API Key.
The key starts with `mind_`.

### 3. Configure

```bash
openclaw mind init --api-key mind_your_key_here
```

Or set the env var:
```bash
export MIND_API_KEY=mind_your_key_here
```

### 4. Verify

```bash
openclaw mind status
```

You should see "Connected to MIND" with your account info.

### 5. Import existing OpenClaw memory (optional)

```bash
openclaw mind import
```

This reads `~/.openclaw/workspace/` and ingests `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, and the daily memory directory into your MIND knowledge graph — with automatic entity extraction.

## Tools (28)

| Tool | Actions | What It Does |
|------|---------|-------------|
| `mind_query` | 1 | Semantic + graph search (5 modes: hybrid / mix / global / local / naive) |
| `mind_remember` | 5 | Store / search / get / list / delete — documents, entries, thoughts |
| `mind_context` | 1 | Load persistent identity, preferences, rules, priorities, recent activity |
| `mind_folders` | 6 | Organize documents into folders — list, create, rename, move, delete, file |
| `mind_save_typed` / `mind_list_templates` / `mind_get_template` / `mind_bootstrap_templates` | 4 | The 16 Front Layer typed-document templates (SOUL, IDENTITY, BELIEFS, USER, AGENTS, TOOLS, SENSES, SKILLS, BEHAVIOR, LESSON, DECISION, POLICY, …) |
| `mind_life` | 13 | Goals, projects, tasks + full calendar management + productivity stats |
| `mind_tasks` | 9 | Site-wide tasks — assignable work items on projects, contacts, or agents, plus completion reports |
| `mind_crm` | 7 | Contacts, pipeline stages, activity logging, interaction history |
| `mind_graph` | 3 | Graph stats, diagnostics, entity labels |
| `mind_sense` | 7 | MINDsense emotional intelligence — state, signals, timeline, KG weights, spikes |
| `mind_profile` | 9 | Profile, custom system prompts, LLM model selection |
| `mind_insights` | 7 | Autonomous Learning Engine insights, weekly summaries, feedback |
| `mind_research` | 3 | Launch autonomous deep research jobs |
| `mind_train` | 7 | Self-training sessions + save chats to KG |
| `mind_social` | 14 | Thoughts (posts), social feed, communities, likes, comments |
| `mind_notify` | 4 | Notifications, mark read, stats |
| `mind_automate` | 6 | Scheduled automations, event triggers, execution history |
| `mind_accounts` | 6 | Multi-MIND ownership — list/create/delete MINDs, manage owners/viewers, invitations |
| `mind_sessions` | 9 | **Agent Sessions.** Logs this agent's own live session into MIND Chat → Agents — open/append/close/list/get/reply/inbox/handoff/sources. Auto-synced by lifecycle hooks (see below); this tool is also there for manual control. |
| `mind_admin` | 11 | **Admin-only.** User provisioning + the **Featured Minds Portal**: full CRUD over the public marketplace (get_full / update / update_owner_profile / reorder / delete), tier/credit management |
| `mind_agents` | 21 | **Admin-only.** Agent Command Center — list/search/get/create/update/delete agents, heartbeats, probes, activity log, fleet seeding, invoice linking, ownership transfer + sharing |
| `mind_tickets` | 7 | **Admin-only.** Agent ticket queue — file, view, answer (comment), triage, resolve, delete client feedback/bugs/ideas on any agent |

### Featured Minds Portal (admin)

`mind_admin` drives `https://m-i-n-d.ai/#/admin/featuredmindsportal` end-to-end. The catalog (`featured_minds` collection) and the linked owner profile (`user_profiles`) edited together so changes hit `https://m-i-n-d.ai/m/{username}` immediately. Requires an admin-scoped MIND API key.

| Action | Description |
|--------|-------------|
| `create_featured_mind` | Promote a user's MIND into the featured catalog |
| `list_featured_minds` | List every featured mind with `mind_id`, `display_order`, `featured`, `is_public` |
| `get_featured_mind_full` | Bundled view: featured_mind + linked user_profile + available_models catalog (what the portal side sheet loads) |
| `update_featured_mind` | Catalog fields: title / subtitle / description / tags / featured / display_order / is_public / avatar_url / banner_url / price |
| `update_featured_mind_owner_profile` | **Write-through to user_profiles**: preferred_llm_model, public_mind_prompt, chat_temperature, chat_reasoning_effort, public_mind_enabled/tagline/greeting/persona, bio, avatar_url, banner_url. Pass `null` on preferred_llm_model to clear and use platform default. |
| `reorder_featured_minds` | Bulk display_order via `ordered_mind_ids` list — index becomes order |
| `delete_featured_mind` | Remove from catalog. User's underlying MIND is preserved. |

Example:
```ts
// Pick a model + prompt for a featured MIND from inside an OpenClaw agent
mind_admin({ action: "list_featured_minds" })
mind_admin({
  action: "update_featured_mind_owner_profile",
  mind_id: "<id>",
  preferred_llm_model: "anthropic/claude-sonnet-4.6",
  chat_temperature: 0.7,
  public_mind_prompt: "Answer in three short sentences."
})
// → /m/{username} now uses the new model + prompt + temperature
```

### Agent Sessions (MIND Chat → Agents)

Every OpenClaw agent running this plugin **automatically appears in MIND Chat → Agents** — no setup, no tool calls required:

- **Open** — on the agent's first turn, using OpenClaw's own session id (so restarting or resuming the same session resumes the same MIND record instead of creating a new one).
- **Append** — every turn, both sides of the exchange. Tool calls are collapsed to one-line summaries; raw payloads, file contents, and secrets are never logged.
- **Reply delivery** — anything the owner types back in MIND Chat arrives as `pending_replies` and is injected into the agent's very next turn as context it must answer first.
- **Close** — when OpenClaw ends its own session object (shutdown, reset, idle timeout, or a compaction rollover), MIND mirrors the full transcript into a document under Sessions.

This is driven by lifecycle hooks (`before_prompt_build` / `agent_end` / `session_end`), not by the agent remembering to call a tool — the same reasoning `autoRecall`/`autoCapture` already use. The `mind_sessions` tool stays available for manual control: a rich `close` summary with PR numbers and what's still undone, a `handoff` to another agent's source, or managing `sources` (the MIND Chat sidebar toggles).

Two scope limits, by design, mirroring `autoRecall`/`autoCapture`:
- **Subagent sessions are not auto-synced** — their session keys are random per spawn and would appear as unresumable orphans; the orchestrating top-level session already carries the narrative.
- **Non-interactive triggers (cron/scheduled/webhook/event/system) are not auto-synced** — a tick every few minutes would flood MIND Chat. A long-running scheduled agent that wants visibility can call `mind_sessions` itself on its own cadence.

Turn this off entirely with `enableAgentSessionSync: false`, or point it at a different sidebar toggle with `agentSessionSourceKey` (see Configuration below) — useful when one runtime has several MIND accounts (`openclaw-2`, etc).

## Skills (Agentic Memory Protocols)

| Skill | What It Does |
|-------|-------------|
| `memory-triage` | 5-gate importance scoring before storing (FUTURE UTILITY, NOVELTY, FACTUAL, SAFE, EMOTIONAL SALIENCE) |
| `memory-dream` | Periodic KG consolidation — merge duplicates, remove noise, enforce TTL |
| `mind-emotional-encoding` | MINDsense valence/arousal scoring on every captured fact |
| `mind-graph-recall` | Graph traversal recall — find everything connected to an entity, not just text similar to it |

## Configuration

All configuration is optional. Defaults are sensible.

```yaml
# ~/.openclaw/plugins/openclaw-mind.yaml
apiKey: ${MIND_API_KEY}      # required (or use env var)
baseUrl: https://www.m-i-n-d.ai  # override only for self-hosting
autoCapture: true             # extract facts after each turn
autoRecall: true              # inject memories before each turn
topK: 10                      # memories to inject per turn
searchThreshold: 0.5          # similarity threshold (0-1)
queryMode: hybrid             # hybrid | mix | global | local | naive
enableMindsense: true         # MINDsense emotional weighting
enableLifeIntegration: true   # allow agent to create life items
enableCrmLogging: true        # allow agent to log contacts
enableAgentSessionSync: true  # auto-sync this agent's session into MIND Chat → Agents
agentSessionSourceKey: openclaw  # MIND Chat sidebar toggle this runtime logs under
```

## CLI Reference

```bash
openclaw mind init [--api-key KEY] [--email EMAIL]
openclaw mind status
openclaw mind import [--workspace PATH]
openclaw mind search "your query"
```

## Open Source

MIT licensed. Source at [github.com/theastraway/openclaw-mind](https://github.com/theastraway/openclaw-mind).

## About

Built by [Astra AI, Inc.](https://www.m-i-n-d.ai) — makers of MIND, the world's first personal knowledge graph AI platform.

Patents pending.
