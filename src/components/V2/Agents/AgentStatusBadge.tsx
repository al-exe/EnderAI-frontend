import type { AgentSpecialistStatus } from "@/api/v2Agents"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<AgentSpecialistStatus, string> = {
  active: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  draft: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  archived: "border-border text-muted-foreground",
}

export function AgentStatusBadge({
  status,
  className,
}: {
  status: AgentSpecialistStatus
  className?: string
}) {
  return (
    <span
      data-testid={`agent-status-${status}`}
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs font-medium capitalize",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" && "bg-emerald-500",
          status === "draft" && "bg-amber-500",
          status === "archived" && "bg-muted-foreground/60",
        )}
      />
      {status}
    </span>
  )
}
