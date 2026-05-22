import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PendingInvitationBadgeProps = {
  count: number
  className?: string
  testId?: string
}

export function PendingInvitationBadge({
  count,
  className,
  testId = "organization-invite-badge",
}: PendingInvitationBadgeProps) {
  if (count <= 0) return null

  const visibleCount = count > 9 ? "9+" : count.toString()
  const title = `${count} pending organization invitation${count === 1 ? "" : "s"}`

  return (
    <Badge
      variant="destructive"
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white",
        className,
      )}
      data-testid={testId}
      title={title}
    >
      {visibleCount}
    </Badge>
  )
}
