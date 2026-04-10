---
name: mind-emotional-encoding
description: >
  UNIQUE TO MIND. Assigns MINDsense emotional weights (valence + arousal) to
  captured memories. High-emotion content gets deeper KG encoding, mirroring
  biological memory consolidation. This is the protocol that makes MIND's
  patented (MIND-PAT-001) emotional intelligence engine work.
user-invocable: false
metadata:
  {"openclaw": {"emoji": "❤️", "requires": {"env": ["MIND_API_KEY"], "bins": []}}}
---

# MINDsense Emotional Encoding Protocol

You assign emotional weights to memories before storing them in MIND. This is what gives MIND's knowledge graph its patented emotional intelligence layer — every memory has a valence (positive ↔ negative) and arousal (calm ↔ intense) score that determines encoding depth.

**Why this matters:** Biological memory works this way. The amygdala tags emotionally significant events, and the hippocampus encodes them more deeply. MIND mirrors this. Emotionally salient memories surface faster in future recalls because they're encoded into more KG nodes and relationships.

**No other memory tool does this.** Mem0 stores text. ChatGPT memory stores text. Notion AI stores text. MIND stores text + emotional structure.

This protocol is INVOKED BY the `memory-triage` skill (Gate 5) — you don't run it standalone. When triage decides a memory passes all 5 gates AND has emotional salience, it calls into this protocol to compute the weights.

## Scoring Dimensions

### Valence: -1.0 (negative) ↔ +1.0 (positive)
The pleasantness of the memory.

| Score | Meaning | Examples |
|-------|---------|----------|
| +1.0 | Peak positive | "Closed the seed round!", "Patent application filed", "Built the first working prototype" |
| +0.5 | Positive | "Good meeting with the investor", "Feature shipped", "User said they like the new design" |
| 0.0 | Neutral | Pure factual updates, configuration changes |
| -0.5 | Negative | "Demo didn't go well", "Bug in production", "Investor passed" |
| -1.0 | Peak negative | "Critical breach", "Co-founder leaving", "Round fell through" |

### Arousal: 0.0 (calm) ↔ 1.0 (intense)
The energy/activation level of the memory.

| Score | Meaning | Examples |
|-------|---------|----------|
| 0.0-0.2 | Calm | Routine status updates, daily check-ins |
| 0.3-0.5 | Mild | Regular work updates, normal milestones |
| 0.6-0.8 | High | Important decisions, key meetings, breakthrough moments |
| 0.9-1.0 | Peak | Crisis, ecstasy, breakthrough, trauma — moments to ALWAYS remember |

### Combined Score → Encoding Depth

```
intensity = (|valence| × 0.6) + (arousal × 0.4)

intensity < 0.2  → SHALLOW: store as basic text, no extra KG passes
intensity 0.2-0.5 → STANDARD: normal entity extraction
intensity 0.5-0.8 → DEEP: extra entity passes, expand related concepts
intensity > 0.8  → CRITICAL: maximum encoding, link to identity/values nodes
```

## Emotion Categories (semantic tags)

In addition to numeric scores, assign one or more semantic categories:

| Category | When |
|----------|------|
| `triumph` | Wins, breakthroughs, achievements |
| `failure` | Losses, setbacks, missed deadlines |
| `surprise` | Anomalies, unexpected outcomes |
| `warning` | Risks, threats, things to watch |
| `learning` | Lessons learned, insights, "ah-ha" moments |
| `preference` | Strong likes/dislikes that shape future decisions |
| `commitment` | Promises, agreements, decisions made |
| `relief` | Resolutions to anxiety or uncertainty |

## Application

When `memory-triage` invokes this protocol:

```
INPUT:
  content: "Closed the seed round! $5M from Acme Capital led, with participation from XYZ."

PROCESSING:
  valence: +0.95 (peak positive)
  arousal: 0.85 (high energy event)
  intensity: (0.95 × 0.6) + (0.85 × 0.4) = 0.91 → CRITICAL
  categories: [triumph, commitment, relief]
  encoding_depth: maximum

OUTPUT (passed to mind_add as metadata):
  {
    "mindsense": {
      "valence": 0.95,
      "arousal": 0.85,
      "intensity": 0.91,
      "categories": ["triumph", "commitment", "relief"],
      "encoding_depth": "critical"
    }
  }
```

## Calibration Rules

- **Don't inflate.** Most facts are intensity 0.2-0.4. Save high scores for genuinely high-emotion content.
- **Use the user's tone, not just the words.** "We finally got the deploy working" carries more emotion than "Deploy succeeded."
- **Negative scores are not bad.** Capturing frustrations is critical — they're often the best signal of what to fix.
- **Cold start dampening.** For the first 10 memories of a new user, halve all intensity scores. The system needs baseline data before trusting weights.
- **Update over time.** If the user repeatedly references a memory, increase its arousal (it's clearly important to them).

## Anti-Patterns

- ❌ Don't score every fact as high-arousal — defeats the purpose
- ❌ Don't ignore arousal and only use valence — miss the calm-but-important memories
- ❌ Don't assign categories you can't justify from the content — be precise
- ❌ Don't use this protocol on tool outputs or system messages — they have no emotional content
