import type { MetricSeriesPoint } from "@/api/v2Metrics"

type Props = {
  title: string
  series: MetricSeriesPoint[]
}

function toNumber(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function MetricTrendChart({ title, series }: Props) {
  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">No data in this window.</p>
      </div>
    )
  }
  const values = series.map((p) => toNumber(p.value))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  const width = 600
  const height = 120
  const stepX = series.length > 1 ? width / (series.length - 1) : 0
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / span) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  )
}
