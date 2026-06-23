import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"

type BackLinkProps = {
  /**
   * Canonical parent route, used only when there is no in-app history to step
   * back through (deep link, refresh, or a freshly opened tab).
   */
  to: string
  /** Label shown when falling back to the canonical parent (e.g. "Library"). */
  fallbackLabel: ReactNode
  /**
   * Label shown when we step back to wherever the user actually came from.
   * Kept generic ("Back") so it stays honest regardless of the origin page.
   */
  backLabel?: ReactNode
  /** Optional leading icon, rendered in both the button and link variants. */
  icon?: ReactNode
  className?: string
  "data-testid"?: string
}

/**
 * Context-aware back affordance for detail pages.
 *
 * When the user reached this page via an in-app cross-link (e.g. a fleet agent
 * → a document it wrote), "back" returns them to that origin via the router
 * history instead of dumping them at the object's top-level list page. When
 * there is no history to step back through, it degrades to a normal link to the
 * canonical parent so deep links and refreshes still have a sensible target.
 */
export function BackLink({
  to,
  fallbackLabel,
  backLabel = "Back",
  icon,
  className,
  "data-testid": testId,
}: BackLinkProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  if (canGoBack) {
    return (
      <button
        type="button"
        onClick={() => router.history.back()}
        className={className}
        data-testid={testId}
      >
        {icon}
        {backLabel}
      </button>
    )
  }

  return (
    <Link to={to} className={className} data-testid={testId}>
      {icon}
      {fallbackLabel}
    </Link>
  )
}
