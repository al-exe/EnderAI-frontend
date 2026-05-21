# How we calculate savings

Tokens Saved and USD Offset come from three **attributable** sources. Anything we can't attribute cleanly is not counted — keeping the dollar figure defensible matters more than making it look bigger.

## What "actually used" means

We count tokens the API call **billed**, not the byte size of the document. Cache reads count at the cache-read rate. Tokens prepared in a tool result but never returned to the model don't count. Raw Details markdown sitting on the doc but not loaded into the turn doesn't count.

## The three sources

### Cache savings — *measured*

Every cache-read token costs ~10% of base input under the Anthropic pricing schedule. We count the delta — `(base_input − cache_read) × cache_read_tokens` — as saved.

### Summary-instead-of-Details — *measured*

When the agent reports `view_consulted: "summary"` on a turn, it told us the model didn't read the full Details payload. We attribute `details_tokens × base_input` as saved — the tokens that would otherwise have been loaded.

If the agent doesn't pass that flag, we don't claim the saving.

### Reuse-on-begin — *estimated*

When the scoring engine reuses an existing document instead of creating a fresh one, we estimate `min(20k, summary_tokens + details_tokens) × base_input` as saved — a conservative floor on what a from-scratch session would have to re-derive. The 20k cap is intentional; a 200k-token doc doesn't mean a from-scratch session would re-derive 200k of context.

## What we don't count

- Conversations the agent shortened heuristically without telling us. Not measurable.
- Conflict signals that blocked a bad reuse — saved future tokens, but the counterfactual is too speculative for a dollar figure.
- Tokens loaded but never attended to by the model.

These show up as observability (counts), not as dollars saved.

## Pricing

We use the rates published at [platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing). Each price change is recorded as a new effective-from row; events priced before the change keep pointing at their original snapshot. No retroactive rewriting.

---

## Avoided Rediscovery (Phase 3, TF-177) — *behind feature flag*

A new savings model is rolling in alongside the three sources above. Once it's the default, the three sources collapse into one defensible card.

### The story

Every document carries a **rediscovery cost** — an estimate of "what would it take an agent to redo this investigation from scratch". When that doc gets surfaced to the agent (via the Taskforce hook on every user prompt — see TF-176), the savings for that consultation is the rediscovery cost minus what the consult actually cost in tokens.

```
net_saved_tokens = max(0, document.rediscovery_cost_tokens − summary_tokens_read)
```

### How we estimate rediscovery cost (v1)

```
rediscovery_cost_tokens =
    1500 × commands
  + 2500 × files inspected
  +  500 × decisions
  + 3000 × details sections
  + 1000 × summary points
```

Capped at **50,000 tokens** per doc so a runaway formula never inflates the dashboard. Coefficients are deliberately round; we'll tune them quarterly from real consult-vs-redo data.

Where the counts come from:
- **Commands** — shell prompts (`$`/`>` lines) and fenced code blocks inside the doc's Details sections
- **Files inspected** — distinct file paths referenced in details (`src/api/foo.py` etc.), with inline-backtick references and basename fallback
- **Decisions** — lines with verbs like "decided to", "picked", "chose"
- **Details sections** — `len(details_markdown_sections)`
- **Summary points** — `len(main_body)` paragraphs

### Worked example

A document captures: 5 commands, 3 files inspected, 2 decisions, 3 details sections, 4 summary points.

```
rediscovery_cost = 5×1500 + 3×2500 + 2×500 + 3×3000 + 4×1000
                = 7500 + 7500 + 1000 + 9000 + 4000
                = 29,000 tokens
```

The hook later surfaces this doc with an 800-token summary. Net saved = `max(0, 29000 − 800)` = **28,200 tokens**, priced ≈ **$0.14** at opus rates. Taskforce's own cost to deliver that match: about **$0.002** in summarizer fees. ~70× recovered on a single consult.

### Why this is better than the three-source model

- **No agent self-report required.** The current `summary_only` source depends on the agent honestly setting `view_consulted: "summary"`. The new model derives savings from the doc's structure plus the consult fact itself.
- **One number, one story.** "Taskforce avoided ~N tokens of rediscovery in this window" is something a CFO can quote.
- **Defensible to skeptics.** The formula is mechanical and tunable. If someone pushes back on the multiplier, we point at the coefficients and the cap.
