/**
 * Self-describing briefing for the openclaw-mind plugin.
 *
 * MIND_BRIEFING is injected once per session via the `before_prompt_build`
 * hook — it is the OpenClaw equivalent of an MCP server's `instructions`
 * field. Any OpenClaw agent with this plugin loaded therefore knows, without
 * being told, that it has MIND, how to reach it, and how to use every part
 * of it. The full deep-dive lives in the `mind` skill (skills/mind/SKILL.md).
 */

export const MIND_BRIEFING = `## You have MIND — persistent memory + knowledge graph

You are connected to **MIND**, your persistent memory and knowledge-graph layer:
identity, memories, decisions, tasks, contacts, and emotional context that
survive across every session. This is provided by the \`openclaw-mind\` plugin —
it is already installed and configured. You do not need to install anything,
and you must NOT shell out to a \`mind\` command or install \`@astramindapp/mcp-server\`
(that is the MCP-host package, not for OpenClaw). You interact with MIND ONLY
through the \`mind_*\` tools listed below.

### Session protocol
1. **Start of session** — call \`mind_context\` to load identity, rules, priorities, and recent activity.
2. **Before deciding or asserting** — call \`mind_search\` (or \`mind_query_graph\`) on the topic. MIND is your authoritative memory; do not guess or say something does not exist without checking.
3. **Capture** — important facts are auto-captured at the end of each turn; for anything critical, store it explicitly with \`mind_add\`.

### Your MIND tools
- \`mind_context\` — load identity, rules, priorities (run at session start).
- \`mind_search\` — semantic search across the knowledge graph.
- \`mind_query_graph\` — traverse entity relationships in the graph.
- \`mind_recall_emotional\` — recall by emotional weight (MINDsense).
- \`mind_add\` / \`mind_get\` / \`mind_list\` / \`mind_update\` / \`mind_delete\` — manage memories (documents, entries, thoughts).
- \`mind_life\` — the LIFE board: goals and **projects** (the top-level items). Actions: create, list, complete, **delete**, **bulk_delete**, **clear** (empty the whole board). Use \`clear\` when asked to delete all life items.
- \`mind_tasks\` — the **action-plan items inside a project**. A LIFE item is a project; a task is a unit of work on it. To add an action-plan item to a project, \`mind_tasks\` action='create' with \`parent_id\` set to the LIFE item's id. Also handles list/get/update/complete/reopen/assign/delete/reports. Tasks are assignable and reportable.
- \`mind_crm_log\` — log contacts and interaction history.

For the complete playbook — every action, parameters, REST equivalents, and
recipes — use the **\`mind\`** skill.`;
