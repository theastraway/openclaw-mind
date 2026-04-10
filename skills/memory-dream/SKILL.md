---
name: memory-dream
description: >
  Memory consolidation protocol for MIND. Reviews stored memories, merges
  duplicates, removes noise and credentials, rewrites unclear entries, and
  consolidates entities in the knowledge graph. Triggers automatically after
  sufficient activity (configurable) or when the user asks to clean up memories.
user-invocable: true
metadata:
  {"openclaw": {"emoji": "💤", "requires": {"env": ["MIND_API_KEY"], "bins": []}}}
---

# MIND Memory Consolidation

You are performing a memory consolidation pass on the MIND knowledge graph. Your goal is to review stored memories for this user and improve their overall quality. Think of this as compressing raw observations into clean, durable knowledge — like sleep consolidates short-term memory into long-term memory in biological brains.

Follow these four phases in order. Do not skip phases.

## Phase 1: Orient

Survey the current memory landscape before making any changes.

1. Call `mind_list` to load the most recent 50 memories
2. Call `mind_query_graph` with question "What are the main entity clusters in my knowledge graph?" to understand structure
3. Note total memory count, oldest/newest dates, and any obvious problems (duplicates, very short entries, entries without temporal anchors)
4. Do not modify anything in this phase. Goal: understand what you're working with.

## Phase 2: Gather Targets

Identify which memories need action.

**Search for recent additions:**
Use `mind_search` to find memories added in the last consolidation window. These are most likely to need merging or cleanup.

**Classify each target:**
- **DELETE** — contains credentials, expired by TTL, pure noise, raw tool output, standalone timestamps, or duplicates of higher-quality entries
- **MERGE** — two or more memories express the same fact in different words, or a series tracks incremental changes to the same entity
- **REWRITE** — vague, missing temporal anchor, uses first person instead of third, wrong category, or overly verbose
- **PROMOTE** — entries that have proven important (referenced often) should be promoted to permanent status

## Phase 3: Act

Execute one operation at a time. Verify each succeeds before moving on.

For each DELETE:
```
mind_delete(id: "...")
```

For each MERGE:
```
1. mind_get(id_a) and mind_get(id_b) — load both
2. Synthesize a single combined version
3. mind_add(content: combined, tags: union of both)
4. mind_delete(id_a)
5. mind_delete(id_b)
```

For each REWRITE:
```
mind_update(id: "...", content: rewritten_content)
```

For each PROMOTE:
```
mind_update(id: "...", tags: [...existing, "permanent", "high-importance"])
```

## Phase 4: Verify

After all operations:

1. Call `mind_query_graph` again with the same question from Phase 1 — entity clusters should be cleaner
2. Run `mind_search` on a few canonical queries the user is known to ask — verify the expected memories surface
3. Report a summary:
   - Total operations: X DELETE, Y MERGE, Z REWRITE, W PROMOTE
   - Entity count delta from Phase 1
   - Any operations that failed and why
4. If anything looks off, stop and ask the user before making more changes

## Safety Rules

- **Never delete a memory without first checking if it's referenced by other memories.** Use `mind_query_graph` to find connections.
- **Never merge memories from different time periods unless they're clearly the same fact.** Temporal context matters.
- **Always preserve credentials-removal operations.** If a memory contained a credential and you redacted it, that redaction itself is important to keep.
- **Stop on any error.** Don't compound mistakes. If a delete fails, investigate before continuing.

## When This Skill Triggers

Manual: User says "consolidate memories", "clean up MIND", "review my knowledge graph"
Automatic: After N hours of activity (configurable via `skills.dream.minHours` and `skills.dream.minSessions`)

## Reporting Format

```
# MIND Consolidation Report — YYYY-MM-DD

Phase 1 baseline: 247 memories, 1843 entities, 4521 relationships
Phase 2 targets: 12 DELETE, 4 MERGE, 8 REWRITE, 3 PROMOTE

Phase 3 results:
✓ 12 DELETE operations succeeded
✓ 4 MERGE operations succeeded (8 → 4 memories)
✓ 8 REWRITE operations succeeded
✓ 3 PROMOTE operations succeeded

Phase 4 verification:
  Entity count: 1843 → 1789 (cleanup)
  Relationship count: 4521 → 4612 (better connections)
  Memory count: 247 → 231

No errors. KG is healthier.
```
