import type { MetricBreakdownEntry } from "@/api/v2Metrics"
import { formatMetricValue } from "./formatters"

type Props = {
  title: string
  rows: MetricBreakdownEntry[]
  format?: "compact-int" | "usd"
}

export function MetricBreakdown({
  title,
  rows,
  format = "compact-int",
}: Props) {
  const total = rows.reduce((acc, row) => acc + row.tokens, 0)
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const share = total > 0 ? row.tokens / total : 0
            return (
              <li key={row.key} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMetricValue(row.tokens, format)}
                  </span>
                </div>
                <div className="h-1 rounded bg-muted">
                  <div
                    className="h-1 rounded bg-foreground/60"
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
