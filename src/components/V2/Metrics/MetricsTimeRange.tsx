import type { MetricsWindow } from "@/api/v2Metrics"
import { cn } from "@/lib/utils"

type Props = {
  value: MetricsWindow
  onChange: (window: MetricsWindow) => void
}

const OPTIONS: { value: MetricsWindow; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
]

export function MetricsTimeRange({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded px-3 py-1 text-sm transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
