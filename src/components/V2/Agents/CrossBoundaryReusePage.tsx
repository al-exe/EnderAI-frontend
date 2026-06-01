import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { readCrossBoundaryReuse } from "@/api/v2CrossBoundaryReuse"
import { useDemoMode } from "@/components/demo-mode-provider"
import {
  V2_PAGE_CONTENT,
  V2_PAGE_FRAME,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"
import { CrossBoundaryReuseCard } from "./CrossBoundaryReuseCard"
import { formatCompactNumber } from "./formatters"

function formatUsdTotal(amount: string): string {
  const parsed = Number.parseFloat(amount)
  if (!Number.isFinite(parsed)) return amount
  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: parsed > 0 && parsed < 0.01 ? 4 : 2,
  })
}

/**
 * TF-202 / C3 — the empty-cell proof view.
 *
 * The single clickable artifact a skeptic verifies: real cross-person,
 * cross-tool reuse events inside the org. Nothing here is seeded — every row is
 * a live C1/C2 event. Org-scoped; deliberately understated.
 */
export function CrossBoundaryReusePage() {
  const { isDemoMode } = useDemoMode()
  const reuseQuery = useQuery({
    queryKey: ["v2-cross-boundary-reuse", isDemoMode],
    queryFn: () => readCrossBoundaryReuse({ demo: isDemoMode }),
  })

  const data = reuseQuery.data
  const events = data?.events ?? []

  return (
    <section className={cn(V2_PAGE_FRAME, "bg-background text-foreground")}>
      <div className={V2_PAGE_CONTENT}>
        <header className="flex flex-col gap-1">
          <span className={V2_TAB_EYEBROW_CLASS}>Empty-cell proof</span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cross-boundary reuse
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Work produced by one teammate in one tool, later reused by another —
            across people and across tools. Measured from real sessions, not
            seeded.
          </p>
        </header>

        {data && events.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {data.proven_event_count}
              </span>{" "}
              proven {data.proven_event_count === 1 ? "event" : "events"}
            </span>
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCompactNumber(data.proven_net_saved_tokens)}
              </span>{" "}
              tokens saved (measured)
            </span>
            <span>
              ~
              <span className="font-semibold tabular-nums text-foreground">
                {formatUsdTotal(data.estimated_usd_total)}
              </span>{" "}
              estimated
            </span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4">
          {reuseQuery.isLoading ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading cross-boundary reuse…
            </div>
          ) : reuseQuery.isError ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
              Couldn't load cross-boundary reuse. This view is
              organization-scoped — you need to belong to an organization with
              shared documents.
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
              No cross-boundary reuse yet. Once a teammate reuses another
              teammate's organization-visible document, it shows up here.
            </div>
          ) : (
            events.map((event) => (
              <CrossBoundaryReuseCard key={event.event_id} event={event} />
            ))
          )}
        </div>
      </div>
    </section>
  )
}
