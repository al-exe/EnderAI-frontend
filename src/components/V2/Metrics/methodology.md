# How we calculate savings

Every number on the Metrics page is **derived, not asserted**. If we can't trace a saving back to a specific document and a specific consultation, we don't count it. Keeping the dollar figure defensible matters more than making it look bigger.

## The one-line formula

```
net_saved_tokens = max(0, rediscovery_cost − tokens_we_used)
```

For each time Taskforce surfaces a document to your agent:

1. We estimate what it would have cost the agent to re-derive that document's content from scratch (**rediscovery cost**).
2. We subtract the tokens Taskforce actually injected (the summary the model read).
3. The difference is what Taskforce saved you on that consultation.

Multiply by the consultation count in the window for the headline number. Multiply by the model's input rate at the time of consultation for the USD figure.

## How we estimate rediscovery cost

Every document carries a **rediscovery cost** computed from its own structure when it was last edited:

```
rediscovery_cost =
    1500 × (shell commands in the doc)
  + 2500 × (files inspected during the original investigation)
  +  500 × (decisions captured)
  + 3000 × (Details sections)
  + 1000 × (Summary points)
```

Capped at **50,000 tokens per document** so an outlier doc never inflates the dashboard. Coefficients are deliberately round; we tune them quarterly against real consult-vs-redo measurements.

Where the counts come from:

- **Commands** — shell prompts (`$` / `>` lines) and fenced code blocks inside the doc
- **Files** — distinct paths the doc references (`app/api/foo.py` etc.)
- **Decisions** — lines starting with "chose", "decided to", "ruled out", "picked"
- **Details sections** — the doc's right-hand panels
- **Summary points** — the doc's left-hand bullets

## Worked example

A real doc in your library: 5 commands, 3 files inspected, 2 decisions, 3 Details sections, 4 Summary points.

```
rediscovery_cost = 5×1500 + 3×2500 + 2×500 + 3×3000 + 4×1000
                = 7,500 + 7,500 + 1,000 + 9,000 + 4,000
                = 29,000 tokens
```

When Taskforce surfaces this doc to your agent, the agent reads an 800-token summary. Net saved on this consultation:

```
max(0, 29,000 − 800) = 28,200 tokens
≈ $0.42 at Opus 4.7 input pricing
```

What Taskforce itself cost to deliver that match: about **$0.002** in summarizer fees. ~200× recovered on a single consult.

## Pricing

USD figures use the model rates published at [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) **at the moment of consultation**, not the current rate. Each rate change is stored as a new effective-from row; events priced before the change keep pointing at their original snapshot. No retroactive rewriting.

When a consultation didn't declare which model the agent was running, we default to Opus 4.7 input pricing.

## What we don't count

- Conversations the agent shortened on its own without telling us. Not measurable.
- Bad reuses Taskforce *prevented* (the agent was about to write a duplicate doc and we caught it). Real value, but the counterfactual is too speculative for a dollar figure.
- Tokens loaded into the agent's context but never attended to by the model.

These appear as observability counts elsewhere on the page, not as dollars saved.
