import { Info } from "lucide-react"
import type { MetricBreakdownEntry } from "@/api/v2Metrics"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatMetricValue } from "./formatters"

type Props = {
  title: string
  rows: MetricBreakdownEntry[]
  format?: "compact-int" | "usd"
  info?: string
}

export function MetricBreakdown({
  title,
  rows,
  format = "compact-int",
  info,
}: Props) {
  const total = rows.reduce((acc, row) => acc + row.tokens, 0)
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${title} information`}
              >
                <Info className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-64">
              {info}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
