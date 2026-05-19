# MIND OpenClaw Plugin — Build Spec

**Status:** PHASE 1 (Investigation) complete. Ready for PHASE 2 (Build).
**Date:** 2026-04-10
**Spec author:** Competitive Analyst Agent → Anthony Conti
**Trigger:** Mem0 shipped `@mem0/openclaw-mem0` v1.0.5 yesterday (2026-04-09). MIND must ship a parity-plus plugin before Mem0 captures the OpenClaw ecosystem.

---

## Executive Summary

OpenClaw is a real, growing platform with major plugin contributors (Tencent, ByteDance/Lark, Ollama, Mem0). It is NOT just an MCP host — it has its own native plugin system with deeper hooks than MCP allows: lifecycle hooks (auto-recall before turn, auto-capture after turn), CLI subcommands, services, and a separate "skills" system for agent protocols.

**The MIND MCP server cannot replace an OpenClaw plugin.** They serve different purposes:

| Feature | MIND MCP Server (existing) | OpenClaw Plugin (to build) |
|---------|---------------------------|----------------------------|
| Tool exposure | ✅ via MCP protocol | ✅ via `api.registerTool()` |
| Auto-recall before each turn | ❌ (agent must call manually) | ✅ via `registerHooks` |
| Auto-capture after each turn | ❌ | ✅ via `registerHooks` |
| Native CLI subcommands (`openclaw mind *`) | ❌ | ✅ via `api.registerCli()` |
| Skills (agent protocols as `.md`) | ❌ | ✅ ships in `skills/` dir |
| One-line install | ❌ (config file edit) | ✅ `openclaw plugins install @astramindapp/openclaw-mind` |
| Discoverable on ClawHub | ❌ | ✅ |

The MCP server stays — it serves Claude Desktop, Cursor, and any MCP-compatible agent. The OpenClaw plugin is additive: it gives OpenClaw users a first-class, frictionless install path with deeper integration than MCP provides.

---

## Investigation Findings

### 1. OpenClaw Platform State

- **Current version:** `openclaw@2026.4.9` (published 2026-04-09 by `steipete`)
- **Plugin SDK version:** `2026.4.1`
- **Distribution channels:** ClawHub (primary, official) + npm (fallback)
- **Install command:** `openclaw plugins install <package>`
- **Plugin format:** TypeScript ESM, Node ≥22

### 2. Plugin Architecture

A plugin has 3 components:

```
@astramindapp/openclaw-mind/
├── package.json              ← npm metadata + openclaw section with manifest pointer
├── openclaw.plugin.json      ← OpenClaw manifest (id, kind, contracts, configSchema, uiHints)
├── dist/index.js             ← compiled entry — exports definePluginEntry({...})
└── skills/                   ← optional agent protocol .md files
    └── <skill-name>/SKILL.md
```

### 3. Entry Point Pattern

```typescript
// src/index.ts
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "openclaw-mind",
  name: "MIND",
  description: "Personal knowledge graph memory for OpenClaw — true KG, 50+ models, MINDsense emotional intelligence",
  register(api) {
    // 1. Register tools
    api.registerTool(createMindSearchTool(deps));
    api.registerTool(createMindAddTool(deps));
    // ... more tools

    // 2. Register CLI subcommands
    api.registerCli({
      name: "mind",
      subcommands: [/* init, status, import, search */]
    });

    // 3. Register lifecycle hooks (auto-recall + auto-capture)
    registerHooks(api, mindClient, config, ...);

    // 4. Register a service (optional)
    api.registerService({/* ... */});
  }
});
```

### 4. Manifest (`openclaw.plugin.json`) Schema

Required fields based on Mem0's manifest:
- `id`: unique plugin id (e.g., `openclaw-mind`)
- `name`: display name
- `description`: 1-line description
- `version`: semver
- `kind`: `memory` for memory plugins
- `skills`: array of relative paths to skill dirs
- `contracts.tools`: list of tool names this plugin provides
- `providerAuthEnvVars`: env vars required for auth
- `providerAuthChoices`: UI hints for setup wizard
- `uiHints`: per-config-field UI labels and help text
- `configSchema`: JSON Schema for validating user config

### 5. Mem0's 8 Tools (What We Beat)

| Tool | Purpose |
|------|---------|
| `memory_search` | Vector similarity search |
| `memory_add` | Store a memory |
| `memory_get` | Get by ID |
| `memory_list` | Paginated list |
| `memory_update` | Update existing |
| `memory_delete` | Delete by ID |
| `memory_event_list` | List events |
| `memory_event_status` | Check event status |

Mem0 ships 2 skills:
- `memory-triage` — 4-gate importance scoring (FUTURE UTILITY, NOVELTY, FACTUAL, SAFE) for auto-capture
- `memory-dream` — 4-phase consolidation protocol (Orient, Gather, Act, Verify)

### 6. Mem0's Lifecycle Hooks

The plugin registers two hooks via `registerHooks(api, ...)`:
- **auto-recall** (before each agent turn): pulls top-k relevant memories, injects into context
- **auto-capture** (after each agent turn): runs the triage skill on the conversation, stores qualifying facts

Per-agent isolation: memories are namespaced by `sessionKey` so subagents don't pollute the main agent's memory.

---

## Build Plan: `@astramindapp/openclaw-mind`

### Differentiation Strategy

We don't just match Mem0. We ship **11 tools (vs their 8)** and **4 skills (vs their 2)**, with capabilities Mem0 cannot replicate:

| Tool | We Have It | Mem0 Has It | Why It Matters |
|------|------------|-------------|----------------|
| `mind_search` | ✅ hybrid (vector + KG) | vector only | Better recall, finds related entities not just similar text |
| `mind_add` | ✅ + entity extraction | text only | Builds the KG automatically |
| `mind_get` | ✅ | ✅ | parity |
| `mind_list` | ✅ | ✅ | parity |
| `mind_update` | ✅ | ✅ | parity |
| `mind_delete` | ✅ | ✅ | parity |
| `mind_query_graph` | ✅ traversal | ❌ | UNIQUE — true KG queries ("who is connected to X") |
| `mind_recall_emotional` | ✅ MINDsense | ❌ | UNIQUE — patent-pending emotional weighting |
| `mind_context` | ✅ structured (soul/user/rules/priorities/recent) | ❌ | UNIQUE — replaces Mem0's flat MEMORY.md import |
| `mind_life` | ✅ tasks/calendar/goals | ❌ | UNIQUE — life management, not just memory |
| `mind_crm_log` | ✅ contacts/activities | ❌ | UNIQUE — CRM, not just memory |

**Skills (agent protocols):**
1. `memory-triage` — adapt Mem0's 4-gate system, add a 5th gate: EMOTIONAL SALIENCE (via MINDsense valence/arousal)
2. `memory-dream` — adapt Mem0's 4-phase consolidation, run on MIND's KG instead of vectors
3. `mind-emotional-encoding` — UNIQUE — runs MINDsense scoring on every captured fact
4. `mind-graph-recall` — UNIQUE — graph traversal recall ("find everything connected to entity X" not just "find text similar to X")

### Auth Strategy

**Mem0's friction:** copy/paste API key OR email magic link with 6-digit code.
**MIND's advantage:** we already have email auth in the web app. We can offer:
1. **API key mode (parity)** — `MIND_API_KEY` env var, get from Settings → Developer
2. **Magic link mode (better)** — `openclaw mind init --email <email>` triggers email send, user enters 6-digit code
3. **Anonymous mode (frictionless)** — `openclaw mind init --anonymous` creates a throwaway account, persists only locally, upgradeable later

Phase 1: Ship just API key mode (fastest). Phase 2: Add magic link for the polish move.

### Technical Stack

- **Language:** TypeScript (ESM)
- **Build tool:** tsup (matching Mem0's setup)
- **Tests:** vitest
- **Dependencies:**
  - `@sinclair/typebox` (for tool schemas — same as Mem0)
  - Custom HTTP client to MIND API (no external SDK needed since we own the backend)
- **License:** MIT
- **Repo:** `theastraway/openclaw-mind` (public, like mind-mcp-server)
- **npm package:** `@astramindapp/openclaw-mind`

### File Layout (Phase 2 Output)

```
/Users/anthonyjconti/Documents/github/openclaw-mind/
├── BUILD-SPEC.md                    ← this file
├── README.md                        ← user-facing install + docs
├── LICENSE                          ← MIT
├── package.json                     ← npm metadata
├── openclaw.plugin.json             ← plugin manifest
├── tsconfig.json                    ← TypeScript config
├── tsup.config.ts                   ← bundler config
├── src/
│   ├── index.ts                     ← definePluginEntry entry
│   ├── mind-client.ts               ← HTTP client to m-i-n-d.ai API
│   ├── tools/
│   │   ├── search.ts                ← mind_search
│   │   ├── add.ts                   ← mind_add
│   │   ├── get.ts
│   │   ├── list.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   ├── query-graph.ts           ← UNIQUE
│   │   ├── recall-emotional.ts      ← UNIQUE
│   │   ├── context.ts               ← UNIQUE
│   │   ├── life.ts                  ← UNIQUE
│   │   └── crm-log.ts               ← UNIQUE
│   ├── hooks/
│   │   ├── auto-recall.ts           ← before-turn hook
│   │   └── auto-capture.ts          ← after-turn hook
│   ├── cli/
│   │   ├── init.ts                  ← openclaw mind init
│   │   ├── status.ts                ← openclaw mind status
│   │   ├── import.ts                ← openclaw mind import (workspace migration)
│   │   └── search.ts                ← openclaw mind search "query"
│   └── lib/
│       ├── session.ts               ← per-agent isolation
│       ├── filter.ts                ← noise detection (mirror Mem0)
│       └── safe.ts                  ← credential scanner
├── skills/
│   ├── memory-triage/
│   │   └── SKILL.md                 ← 5-gate triage with MINDsense
│   ├── memory-dream/
│   │   └── SKILL.md                 ← KG consolidation
│   ├── mind-emotional-encoding/
│   │   └── SKILL.md                 ← MINDsense scoring protocol
│   └── mind-graph-recall/
│       └── SKILL.md                 ← Graph traversal recall
└── tests/
    ├── tools.test.ts
    ├── hooks.test.ts
    └── client.test.ts
```

### Implementation Phases

**Phase 2a — Scaffold (Day 1)**
- Init repo at `/Users/anthonyjconti/Documents/github/openclaw-mind/`
- `package.json`, `openclaw.plugin.json`, `tsconfig.json`, `tsup.config.ts`
- `src/index.ts` with `definePluginEntry` skeleton
- `src/mind-client.ts` HTTP client (auth + base methods)
- `README.md` with install instructions
- Verify build passes (`npm run build`)

**Phase 2b — Tools (Day 1-2)**
- All 11 tools in `src/tools/`
- Each tool: input schema (typebox) + handler that calls `mind-client.ts`
- Type-safe end to end
- Tests for each tool

**Phase 2c — Lifecycle Hooks (Day 2)**
- `auto-recall.ts`: hybrid search before each turn, inject top-k into context
- `auto-capture.ts`: run after each turn, gate via triage skill, store qualifying facts
- Per-agent isolation via sessionKey
- Configurable via `autoRecall: bool`, `autoCapture: bool`

**Phase 2d — CLI Subcommands (Day 2-3)**
- `openclaw mind init [--api-key | --email]` — auth flow
- `openclaw mind status` — verify connected, show user/account info
- `openclaw mind import <path>` — import OpenClaw workspace files into MIND KG
- `openclaw mind search "query"` — quick CLI search

**Phase 2e — Skills (Day 3)**
- Port `memory-triage` from Mem0 (Apache-2.0 allows it), add 5th MINDsense gate
- Port `memory-dream`, adapt phases for KG instead of vectors
- Write `mind-emotional-encoding` from scratch (UNIQUE)
- Write `mind-graph-recall` from scratch (UNIQUE)

**Phase 2f — Polish + Publish (Day 3-4)**
- README with marketing pitch
- Landing page draft for `m-i-n-d.ai/openclaw`
- Setup script draft for `m-i-n-d.ai/openclaw-setup`
- Push to GitHub at `theastraway/openclaw-mind`
- Publish to npm: `npm publish --access public`
- (Optional) Submit to ClawHub directory

**Phase 2g — Marketing Move (Day 4-5, separate from build)**
- Write a Substack post: "MIND now ships a native OpenClaw plugin"
- Add comparison page on m-i-n-d.ai/openclaw vs mem0.ai/openclaw
- Tweet with side-by-side install instructions
- Post to relevant communities (HN if signal is strong enough)

### Risk and Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| OpenClaw plugin SDK has undocumented requirements | Medium | We have Mem0's compiled code as a working reference |
| MIND API doesn't expose all needed endpoints | Low | We own the backend; add what's missing |
| ClawHub directory has gatekeeping | Unknown | Publish to npm first, ClawHub second |
| Mem0 ships an update during our build | High | They're moving fast — we ship in 5 days, not 2 weeks |
| OpenClaw user base is too small to matter | Low | Tencent + ByteDance + Lark + Ollama all building plugins says otherwise |

### Success Criteria

The plugin is "done" when:
- [ ] `openclaw plugins install @astramindapp/openclaw-mind` works on a clean machine
- [ ] All 11 tools are callable from an OpenClaw agent session
- [ ] Auto-recall injects MIND memories before agent turns (configurable)
- [ ] Auto-capture extracts facts after agent turns (gated by triage skill, configurable)
- [ ] `openclaw mind init` completes auth in <60 seconds
- [ ] `openclaw mind import` migrates OpenClaw workspace files into MIND KG with entity extraction
- [ ] Tests pass (`npm test`)
- [ ] Published to npm
- [ ] Public GitHub repo at `theastraway/openclaw-mind`
- [ ] README pitches the differentiation clearly
- [ ] Patent Agent reviews whether any plugin internals are patentable

### Leverage Score (Final)

- **Impact: 10** — Defends MIND's MCP/agent ecosystem position. Mem0 was first to OpenClaw; if we don't ship within a week, they keep that distribution.
- **Ease: 6** — 5 days of focused work. Most logic exists in MIND backend already; the plugin is a thin wrapper.
- **Leverage: 60** — Solidly Priority 1.

---

## Decision Required

**Approve to start Phase 2 build?**

If yes, I'll:
1. Scaffold the repo (Phase 2a) immediately
2. Build tools, hooks, CLI, skills (Phase 2b-e) in sequence
3. Test and publish (Phase 2f)
4. Hand off the marketing move (Phase 2g) to you

If no, I'll log this as a Priority 1 `mind_life` item and we revisit.
