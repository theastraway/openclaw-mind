---
name: memory-triage
description: >
  Persistent long-term memory protocol powered by MIND. Evaluates conversations
  for durable facts worth storing in the MIND knowledge graph. Beats Mem0's
  triage protocol with a 5th gate: EMOTIONAL SALIENCE (via MINDsense).
  Loaded by the openclaw-mind plugin when skills mode is active.
user-invocable: false
metadata:
  {"openclaw": {"always": false, "emoji": "🧠", "requires": {"env": ["MIND_API_KEY"], "bins": []}}}
---

# MIND Memory Triage Protocol

You have persistent long-term memory powered by the MIND knowledge graph. After responding to the user, evaluate this turn for durable, actionable facts worth persisting across future sessions.

Your role is to extract relevant information and store it via `mind_add`. Unlike flat memory tools, MIND will automatically extract entities, relationships, AND emotional weights from what you store — so each fact contributes to a structured knowledge graph, not just a vector index.

**The core question:** "Would a new agent — with no prior context — benefit from knowing this?" If no → do nothing. Most turns produce zero memory operations. That is correct and expected.

## The 5-Gate Decision

Every candidate fact must pass ALL FIVE gates:

### Gate 1 — FUTURE UTILITY
Would this matter to a new agent days or weeks from now?
- **Pass:** identity, configurations, standing rules, preferences with rationale, decisions, project milestones, relationships, important personal details
- **Fail:** tool outputs, status checks, one-time commands, transient state, small talk, generic responses → SKIP

### Gate 2 — NOVELTY
Check your recalled memories — is this already known?
- Already known and unchanged → SKIP
- Known but materially changed → UPDATE (use `mind_update`)
- Genuinely new → proceed
- **Material difference test:** Only UPDATE if new information adds real context, details, or changes meaning. Cosmetic differences (synonyms, rephrasing) are NOT updates.

### Gate 3 — FACTUAL
Is this a concrete, actionable fact — not vague or rhetorical?
- **Pass:** specific names, configs, choices with rationale, deadlines, system states, plans, preferences
- **Fail:** vague impressions, questions, small talk, generic acknowledgments → SKIP

### Gate 4 — SAFE
Does this contain ANY credential, secret, or token?
- Scan for: `sk-`, `mind_`, `m0-`, `ghp_`, `AKIA`, `ak_`, `Bearer `, webhook URLs with tokens, `password=`, `token=`, `secret=`, `.env` values
- ANY match → NEVER STORE the value. Instead, store that the credential was configured:
  - WRONG: "User's API key is sk-abc123..."
  - RIGHT: "API key was configured for the OpenAI service (as of 2026-04-10)"
- When in doubt → SKIP. No exceptions.

### Gate 5 — EMOTIONAL SALIENCE *(UNIQUE TO MIND)*
Does this carry emotional weight that should influence encoding depth?
- **High-priority emotional content** (gets deeper encoding via MINDsense):
  - Triumph / wins / breakthroughs → tag with `emotion:triumph`
  - Frustrations / blockers / failures → tag with `emotion:warning`
  - Strong preferences expressed with feeling → tag with `emotion:preference`
  - Surprises / anomalies → tag with `emotion:surprise`
- **Low-priority emotional content** (still stored, normal encoding):
  - Routine factual updates without emotional charge
- **Why this matters:** MIND's MINDsense engine uses valence/arousal scoring to determine how deeply content is encoded into the knowledge graph. Emotionally significant content surfaces faster in future recalls, mirroring biological memory consolidation. This is patented (MIND-PAT-001).

If a fact passes ALL 5 gates, store it via `mind_add` with appropriate tags.

## What to Extract (Priority Order)

### 1. Configuration & System State (always store)
Tools/services configured, model assignments, cron schedules, deployment configs, architecture decisions, file paths, IDs, machine specs.
```
mind_add(
  content: "User's Tailscale machine 'mac' (IP 100.71.135.41) is configured under user@domain.com (as of 2026-04-10)",
  tags: ["config", "infra"]
)
```

### 2. Standing Rules & Policies (always store + emotional weight)
Explicit user directives about behavior. Workflow policies. Security constraints. Always capture the WHY.
```
mind_add(
  content: "User rule: never create accounts without explicit consent. Reason: security policy",
  tags: ["rule", "security", "emotion:preference"]
)
```

### 3. Decisions & Their Rationale (always store)
Choices the user made and why. Future agents need to understand the reasoning, not just the outcome.

### 4. Identity & Relationships (always store)
Who the user is, who they work with, who their investors/partners/customers are. Use `mind_crm_log` for contacts specifically.

### 5. Goals, Projects, Deadlines (use mind_life)
For tasks/goals/projects, prefer `mind_life` over `mind_add` so they appear in the user's task UI.

## What NOT to Extract

- Acknowledgments ("got it", "thanks", "sure")
- Generic assistant responses
- Tool output dumps
- Transient state (current cursor position, scroll position, etc.)
- Anything that fails Gate 4 (credentials)
- Anything the user explicitly said to NOT remember

## Tool Usage Pattern

```
1. Recall first: mind_search("relevant query") — check if this is already known
2. If new and passes all 5 gates: mind_add(content, tags)
3. If known but changed: mind_update(id, new_content)
4. If a person is mentioned: mind_crm_log(action: "create_contact" or "log_activity")
5. If a task/goal/deadline: mind_life(action: "create")
6. Skip silently if any gate fails
```

## Reporting

Most turns: silent (zero operations).
Some turns: 1-2 operations.
Rare turns: 3+ operations (major information density).

Never announce "I stored this in MIND" — the user doesn't need that noise. Just do the work.
