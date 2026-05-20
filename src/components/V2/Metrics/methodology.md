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
