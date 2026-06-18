import {
  formatCommandBlockText,
  isCommandLikeText,
} from "@/components/V2/Fleet/fleetStatus"
import { Markdown } from "@/components/V2/Fleet/Markdown"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"

export function ActivityProse({
  children,
  className,
  compact,
}: {
  children: string
  className?: string
  compact?: boolean
}) {
  if (isCommandLikeText(children)) {
    return (
      <pre
        className={cn(
          styles.cmdBlock,
          compact && styles.cmdBlockCompact,
          className,
        )}
        data-testid="fleet-command-block"
      >
        <code>{formatCommandBlockText(children)}</code>
      </pre>
    )
  }

  return <Markdown className={className}>{children}</Markdown>
}
