import { cn } from "@/lib/utils"

export type ScopeFilterItem<TKey extends string> = {
  key: TKey
  label: string
  /** Optional trailing count badge (omit to render the label alone). */
  count?: number
}

/**
 * Shared horizontal scope/filter bar used across v2 pages (Profiles, Library).
 * Single source of truth for the bordered tab strip + trailing sort chip so the
 * two pages can't drift apart visually.
 */
export function ScopeFilterBar<TKey extends string>({
  items,
  active,
  onChange,
  sortLabel,
  className,
}: {
  items: ScopeFilterItem<TKey>[]
  active: TKey
  onChange: (key: TKey) => void
  sortLabel: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch border-y border-border font-mono text-[11px] uppercase tracking-[0.1em]",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex items-center gap-1.5 border-r border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
              isActive && "text-foreground shadow-[inset_0_-2px_0_#8447ff]",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="text-muted-foreground/80">{item.count}</span>
            )}
          </button>
        )
      })}
      <div className="ml-auto border-l border-border px-3 py-2 text-muted-foreground">
        Sort: {sortLabel}
      </div>
    </div>
  )
}
