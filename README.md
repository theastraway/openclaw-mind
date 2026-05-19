# @astramindapp/openclaw-mind

**MIND personal knowledge graph for OpenClaw.** 11 tools, 4 skills, full lifecycle hooks. The most complete memory plugin for AI agents.

Other memory plugins store text. **MIND understands it.**

```bash
openclaw plugins install @astramindapp/openclaw-mind
```

## What MIND Adds to OpenClaw

- **True knowledge graph** — Every memory becomes entities + relationships, not flat text
- **50+ AI models** — Switch between GPT, Claude, Gemini, Llama, DeepSeek, Grok mid-conversation
- **MINDsense emotional intelligence** *(patented)* — Valence + arousal weighting determines encoding depth, mirroring biological memory
- **Autonomous learning** — 8 pattern detectors run daily on your KG, surface insights you didn't ask for
- **Life management** — Goals, projects, tasks, calendar, all synced from agent conversations
- **CRM** — Contacts and interaction history captured automatically
- **Cross-agent** — Memories shared across every OpenClaw agent, MCP client, and the MIND web app

## Why Not Just Use Mem0 or Another Memory Plugin?

| Feature | MIND | Mem0 | Anthropic Memory MCP |
|---------|------|------|----------------------|
| Tools | **12** | 8 | 8 |
| Knowledge graph | ✅ true KG | ❌ vectors only | ❌ JSON |
| 50+ AI models | ✅ | ❌ provider-agnostic but no UI | ❌ Claude only |
| Emotional intelligence | ✅ MINDsense (patented) | ❌ | ❌ |
| Auto-recall before turn | ✅ | ✅ | ❌ |
| Auto-capture after turn | ✅ | ✅ | ❌ |
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

## Tools

| Tool | What It Does |
|------|-------------|
| `mind_search` | Hybrid semantic + graph search across the KG |
| `mind_add` | Store content with auto entity/relationship extraction |
| `mind_get` | Retrieve a memory by ID |
| `mind_list` | Paginated list of memories |
| `mind_update` | Update an existing memory |
| `mind_delete` | Soft delete with retention policy |
| `mind_query_graph` | Graph traversal queries — find connected entities |
| `mind_recall_emotional` | MINDsense-weighted recall — emotionally salient memories first |
| `mind_context` | Load persistent identity (soul, user, rules, priorities, recent) |
| `mind_life` | Manage the LIFE board — goals and projects (the top-level items) |
| `mind_tasks` | Manage action-plan items inside a project — create/list/update/complete/assign tasks |
| `mind_crm_log` | Log contacts and interaction history |

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

Patents pending: MIND-PAT-001 (MINDsense Emotional Intelligence Engine, App. No. 64/030,662) and MIND-PAT-002 (Cross-Agent Persistent Memory via Model Context Protocol).
