import type { MetricsScope } from "@/api/v2Metrics"
import { cn } from "@/lib/utils"

type Props = {
  value: MetricsScope
  onChange: (scope: MetricsScope) => void
  disabled?: boolean
}

const OPTIONS: { value: MetricsScope; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "organization", label: "Organization" },
]

export function MetricsScopeToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Scope"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1",
        disabled && "opacity-50",
      )}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
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
