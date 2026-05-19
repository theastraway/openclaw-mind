---
name: mind
description: >
  The complete guide to MIND — your persistent memory and knowledge-graph
  layer. Read this to know exactly how to interact with everything MIND
  offers: the tools, the session protocol, life management, CRM, the
  knowledge graph, and emotional recall. Loaded by the openclaw-mind plugin.
user-invocable: true
metadata:
  {"openclaw": {"always": false, "emoji": "🧠", "requires": {"env": ["MIND_API_KEY"], "bins": []}}}
---

# MIND — Complete Usage Guide

You have **MIND**: your persistent memory and knowledge-graph layer. It holds
identity, memories, decisions, goals, tasks, contacts, and emotional context,
and makes them queryable across every session — so you never start from zero.

MIND is provided by the **`openclaw-mind` plugin**, which is already installed
and configured for you. You do not install anything. You do **not** run a
`mind` shell command, and you do **not** install `@astramindapp/mcp-server`
(that package is for MCP hosts like Claude Code — not OpenClaw). You interact
with MIND **only** through the `mind_*` tools below.

## Session protocol — do this every session

1. **Start** — call `mind_context`. Loads identity, operating rules, current priorities, and recent activity. Never skip it.
2. **Before deciding or asserting** — call `mind_search` (or `mind_query_graph` for relationships). MIND is your authoritative memory; never claim something does not exist without checking.
3. **Capture** — important facts are captured automatically at the end of each turn. For anything critical or decision-grade, store it explicitly with `mind_add`.

## The tools

### Memory
- **`mind_context`** — load identity, rules, priorities, recent activity.
- **`mind_search`** — semantic search across the knowledge graph; returns an AI-synthesized answer with sources.
- **`mind_query_graph`** — traverse entity relationships ("who/what is connected to X").
- **`mind_recall_emotional`** — recall memories by emotional weight (MINDsense valence/arousal).
- **`mind_add`** — store a new memory (document, entry, or thought). MIND auto-extracts entities, relationships, and emotional weights.
- **`mind_get`** — fetch a memory by id.
- **`mind_list`** — list memories.
- **`mind_update`** — edit an existing memory.
- **`mind_delete`** — remove a memory by id.

### Life management
A LIFE item is a **project** (or goal). The work inside a project is a list of
**tasks** — what the app shows as the project's Action Plan. `mind_life` manages
the projects; `mind_tasks` manages the action-plan items inside them.

- **`mind_life`** — the LIFE board: goals and projects (the top-level items). Actions:
  - `create` — add a goal/project.
  - `list` — show the board (defaults to all items).
  - `complete` — mark an item done.
  - `delete` — remove one item by `item_id`.
  - `bulk_delete` — remove many items at once via `item_ids` (up to 200 per call).
  - `clear` — delete **every** item on the board. Use this when asked to "empty", "clear", or "delete all" life items.
- **`mind_tasks`** — the action-plan items / tasks inside a project. Actions:
  - `create` — add a task. To attach it to a project, pass `parent_id` = the LIFE item's id (`parent_type` defaults to `life_item`).
  - `list` — list tasks; filter by `parent_id` to see one project's action plan.
  - `get` / `update` / `complete` / `reopen` / `delete` — manage a task by `task_id`.
  - `assign` — assign a task to a member, an agent, or an external email.
  - `reports` — completion analytics (optionally scoped to one project).

### People
- **`mind_crm_log`** — log a contact or an interaction (call, email, meeting, note) to MIND CRM.

## How MIND fits the wider system

MIND is one knowledge graph reachable three ways. You, as an OpenClaw agent,
use the **plugin** — these `mind_*` tools. The same graph is also reachable by
MCP hosts (via the `@astramindapp/mcp-server` package) and by any other program
(via the REST API at `https://m-i-n-d.ai/developer/v1` with an `X-API-Key`
header). They all read and write the same data. You never need the other two
paths — the plugin is your path.

## Common recipes

- **Empty the life board** — `mind_life` with action `clear`. One call, deletes everything.
- **Delete a few items** — `mind_life` action `bulk_delete` with their `item_ids`.
- **Build out a project** — `mind_life` `create` the project, then `mind_tasks` `create` each action-plan item with `parent_id` set to the project's id.
- **See a project's action plan** — `mind_tasks` `list` filtered by `parent_id`.
- **Start a session right** — `mind_context`, then `mind_search` for anything you are about to act on.
- **Remember an outcome** — `mind_add` with the fact, the right type, and tags.
- **Log a contact touch** — `mind_crm_log`.

## Rules

- MIND is the brand (by Astra AI). Never reference underlying libraries in
  user-facing output.
- Treat MIND as authoritative memory: when MIND and a local file disagree,
  reconcile explicitly — do not silently pick one.
- If a `mind_*` tool ever returns an error, report it plainly; do not invent a
  workaround or pretend the action succeeded.
