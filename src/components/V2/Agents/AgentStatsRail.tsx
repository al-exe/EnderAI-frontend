import type { AgentSpecialistStats } from "@/api/v2Agents"
import { formatCompactNumber, formatUsd } from "./formatters"

type Props = {
  stats: AgentSpecialistStats
}

export function AgentStatsRail({ stats }: Props) {
  const rows = [
    ["Tokens saved", formatCompactNumber(stats.tokens_saved)],
    ["USD saved", formatUsd(stats.usd_saved)],
    ["Invocations", stats.invocations_count.toLocaleString()],
    ["Linked docs", stats.linked_docs_count.toLocaleString()],
  ]

  return (
    <aside className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Profile impact</h2>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-muted/40 p-4">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}
