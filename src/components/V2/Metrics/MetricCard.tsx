import type { MetricDefinitionPublic, MetricValuePublic } from "@/api/v2Metrics"
import { cn } from "@/lib/utils"
import { formatDelta, formatMetricValue } from "./formatters"

type Props = {
  definition: MetricDefinitionPublic
  value: MetricValuePublic | undefined
}

export function MetricCard({ definition, value }: Props) {
  const format = definition.presentation.format
  const total = formatMetricValue(value?.total, format)
  const delta =
    definition.presentation.trend && value?.delta_vs_prev_window != null
      ? formatDelta(value.delta_vs_prev_window, format)
      : null

  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">
        {definition.display_name}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{total}</div>
      {delta && (
        <div
          className={cn(
            "mt-1 text-sm tabular-nums",
            delta.sign === "up" && "text-emerald-600 dark:text-emerald-400",
            delta.sign === "down" && "text-rose-600 dark:text-rose-400",
            delta.sign === "flat" && "text-muted-foreground",
          )}
        >
          {delta.sign === "flat" ? (
            "No change from previous period"
          ) : (
            <>
              {delta.sign === "up" ? "▲ " : "▼ "}
              {delta.label} from previous period
            </>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {definition.description}
      </p>
    </div>
  )
}
