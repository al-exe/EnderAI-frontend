import { cn } from "@/lib/utils"

export type ScopeFilterItem<TKey extends string> = {
  key: TKey
  label: string
  /** Optional trailing count badge (omit to render the label alone). */
  count?: number
}

/**
 * Shared horizontal scope/filter bar used across Taskforce v2 pages (Profiles,
 * Library, Metrics, Ledger). Single source of truth for the bordered tab strip
 * (+ optional trailing sort chip) so the pages can't drift apart visually.
 *
 * Omit `sortLabel` when a page filters but doesn't sort — the trailing chip is
 * then dropped so the bar works as a pure scope selector.
 */
export function ScopeFilterBar<TKey extends string, TSortKey extends string = string>({
  items,
  active,
  onChange,
  sortModes,
  activeSortMode,
  onSortModeChange,
  sortDir,
  onSortDirToggle,
  sortLabel,
  onSortToggle,
  className,
}: {
  items: ScopeFilterItem<TKey>[]
  active: TKey
  onChange: (key: TKey) => void
  /** Optional sort-field tabs (e.g. A–Z / Recent) rendered after scope filters. */
  sortModes?: ScopeFilterItem<TSortKey>[]
  activeSortMode?: TSortKey
  onSortModeChange?: (key: TSortKey) => void
  sortDir?: "asc" | "desc"
  onSortDirToggle?: () => void
  sortLabel?: string
  /** When provided, the trailing sort chip becomes a clickable toggle. */
  onSortToggle?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch border-y border-border font-mono text-[11px] tracking-[0.01em]",
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
      {sortModes?.map((mode, index) => {
        const isActive = mode.key === activeSortMode
        return (
          <button
            key={mode.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSortModeChange?.(mode.key)}
            className={cn(
              "flex items-center gap-1.5 border-r border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
              index === 0 && "border-l",
              isActive && "text-foreground shadow-[inset_0_-2px_0_#8447ff]",
            )}
          >
            {mode.label}
          </button>
        )
      })}
      {onSortDirToggle ? (
        <button
          type="button"
          onClick={onSortDirToggle}
          aria-label={sortDir === "desc" ? "Sort descending" : "Sort ascending"}
          className="ml-auto border-l border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          Sort: {sortDir === "desc" ? "↓" : "↑"}
        </button>
      ) : null}
      {sortLabel !== undefined &&
        !onSortDirToggle &&
        (onSortToggle ? (
          <button
            type="button"
            onClick={onSortToggle}
            className="ml-auto border-l border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            Sort: {sortLabel}
          </button>
        ) : (
          <div className="ml-auto border-l border-border px-3 py-2 text-muted-foreground">
            Sort: {sortLabel}
          </div>
        ))}
    </div>
  )
}
