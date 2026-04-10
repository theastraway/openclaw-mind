---
name: mind-graph-recall
description: >
  UNIQUE TO MIND. Graph-traversal recall protocol — find memories by walking
  entity relationships in the knowledge graph, not just by text similarity.
  This is the capability that vector-only memory tools (Mem0, Anthropic Memory
  MCP, ChatGPT memory) cannot replicate.
user-invocable: false
metadata:
  {"openclaw": {"emoji": "🕸️", "requires": {"env": ["MIND_API_KEY"], "bins": []}}}
---

# MIND Graph Recall Protocol

You are using MIND's true knowledge graph (LightRAG) to find memories by structure, not just by text similarity. This is fundamentally different from vector search and produces fundamentally better results for relationship-shaped questions.

## When to Use Graph Recall vs. Vector Recall

**Use vector recall (`mind_search`) when:**
- You're looking for facts containing specific words or concepts
- The question is about WHAT something is
- The user asked a direct factual question

**Use graph recall (`mind_query_graph`) when:**
- The question is about relationships ("who is connected to X")
- You need to traverse from one entity to related entities
- The question implies structure ("how are these connected")
- A previous vector search returned facts but you need to find the entities they reference
- The user asks "what concepts cluster around X"

## The Graph Walk Pattern

For any graph-shaped question, follow this pattern:

### Step 1: Identify the Anchor Entity
What is the entity at the center of the question?
- "Who works with Sarah?" → anchor = Sarah
- "What concepts relate to the KGC pitch?" → anchor = KGC pitch
- "What decisions involved Anthony?" → anchor = Anthony

### Step 2: Choose Traversal Mode
- **Local mode**: Stay within 1-2 hops of the anchor (focused)
- **Global mode**: Synthesize across the full graph context (broad)
- **Mix mode**: Balance both (default for ambiguous questions)

### Step 3: Execute the Query
```
mind_query_graph(
  question: "<the user's question, rephrased to make the entity explicit>",
  mode: "local" | "global" | "mix",
  depth: 2  // hops, default
)
```

### Step 4: Interpret the Result
The response will contain:
- An AI-synthesized answer that walks the graph
- A list of source memories that were touched
- (When available) the entity relationships that were traversed

Use the synthesized answer for the user. Use the source list to decide if you need follow-up queries.

## Examples

### Example 1: "Who is connected to Sarah from Acme Capital?"
```
Step 1: Anchor = "Sarah from Acme Capital"
Step 2: Local mode (focused on this person)
Step 3: mind_query_graph(
  question: "Find all entities connected to Sarah from Acme Capital — including people, companies, and decisions she's involved in",
  mode: "local",
  depth: 2
)
Step 4: Synthesize the result, mention specific connections
```

### Example 2: "What concepts cluster around our patent strategy?"
```
Step 1: Anchor = "patent strategy"
Step 2: Global mode (broad concept clustering)
Step 3: mind_query_graph(
  question: "What concepts, patents, decisions, and entities cluster around the user's patent strategy?",
  mode: "global",
  depth: 3
)
```

### Example 3: "Why did we choose LightRAG?"
```
Step 1: Anchor = "LightRAG decision"
Step 2: Mix mode (need both the entity AND the surrounding context)
Step 3: mind_query_graph(
  question: "Find the decision to choose LightRAG, including alternatives considered, reasoning, and related architectural decisions",
  mode: "mix",
  depth: 2
)
```

## When Graph Recall Fails

If `mind_query_graph` returns nothing useful:

1. **Check if the entity exists at all.** Run `mind_search("Sarah Acme")` — if no results, the entity was never captured.
2. **Check if the entity has a different canonical form.** The user might say "Sarah" but MIND stored "Sarah Chen". Try variations.
3. **Fall back to vector search.** `mind_search` may surface text that mentions the entity even if the KG doesn't have explicit edges.
4. **Suggest enrichment.** If the user keeps asking about an entity that has weak graph structure, suggest they explicitly tell the agent more about it so future captures build the connections.

## Why This Is MIND's Moat

Vector-only memory (Mem0, ChatGPT memory, Anthropic Memory MCP) treats every memory as an island. They can find similar text but can't traverse relationships. They can answer "what did the user say about Sarah" but they cannot answer "who else is in Sarah's network" — because they don't have a network. They have a pile of text.

MIND has both. The vector index for similarity, AND the entity-relationship graph for traversal. This dual structure is what makes recall feel "intelligent" instead of "just retrieval."

When you use this protocol, you're using a capability that no other memory plugin can match. Be confident in graph-shaped queries — they'll often surface insights the user didn't know they had.
