import { AlertCircle, Loader2, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function QueryErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  compact = false,
  testId,
}: {
  title: string
  description: string
  onRetry: () => void
  isRetrying?: boolean
  compact?: boolean
  testId?: string
}) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        "border border-destructive/30 bg-destructive/5 text-foreground",
        compact
          ? "flex flex-wrap items-center justify-between gap-3 px-3 py-2"
          : "flex min-h-52 flex-col items-start justify-center p-8",
      )}
    >
      <div className={cn("flex gap-3", !compact && "max-w-xl")}>
        <AlertCircle
          className={cn(
            "shrink-0 text-destructive",
            compact ? "mt-0.5 size-4" : "mt-1 size-5",
          )}
          aria-hidden
        />
        <div>
          <h2 className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>
            {title}
          </h2>
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "mt-0.5 text-xs" : "mt-2 text-sm leading-6",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={cn(!compact && "mt-5")}
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RotateCw className="size-4" aria-hidden />
        )}
        {isRetrying ? "Trying again…" : "Try again"}
      </Button>
    </div>
  )
}
