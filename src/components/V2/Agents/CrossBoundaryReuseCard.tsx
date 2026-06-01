import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import type { CrossBoundaryReuseEvent } from "@/api/v2CrossBoundaryReuse"
import { Badge } from "@/components/ui/badge"
import { formatCompactNumber } from "./formatters"

type Props = {
  event: CrossBoundaryReuseEvent
}

const KNOWN_CLIENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
}

function clientLabel(value: string | null): string {
  if (!value) return "an unknown tool"
  return KNOWN_CLIENT_LABELS[value] ?? value
}

function formatUsd(amount: string): string {
  const parsed = Number.parseFloat(amount)
  if (!Number.isFinite(parsed)) return amount
  // Sub-cent savings are real but round to "$0.00"; show more precision so the
  // figure stays honest rather than understating a true saving to nothing.
  const maximumFractionDigits = parsed > 0 && parsed < 0.01 ? 4 : 2
  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })
}

/**
 * Renders ONE cross-boundary reuse event (TF-202 / C3): work produced by one
 * teammate in one tool, later reused by another teammate in another tool.
 * Deliberately understated — a quiet ledger row with a provenance trail, not a
 * celebratory banner. The token count is measured ("proven"); the dollar
 * figure is an estimated floor when `usd_is_estimated`.
 */
export function CrossBoundaryReuseCard({ event }: Props) {
  const occurred = new Date(event.occurred_at).toLocaleString()

  return (
    <div className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm leading-6 text-foreground">
          Produced in{" "}
          <span className="font-semibold">
            {clientLabel(event.produced_by_client)}
          </span>{" "}
          by <span className="font-semibold">{event.owner_name}</span>
          {" · Reused in "}
          <span className="font-semibold">
            {clientLabel(event.consumed_by_client)}
          </span>{" "}
          by <span className="font-semibold">{event.consumer_name}</span>
        </p>
        <Badge variant="outline">
          {event.kind === "document.reused" ? "Reused" : "Consulted"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          ~
          <span className="font-medium tabular-nums text-foreground">
            {formatCompactNumber(event.net_saved_tokens)}
          </span>{" "}
          tokens saved
        </span>
        <span>·</span>
        <span>
          <span className="font-medium tabular-nums text-foreground">
            {formatUsd(event.usd_amount)}
          </span>
          {event.usd_is_estimated ? " (estimated)" : ""}
        </span>
      </div>

      {/* Provenance trail — the drill-down a skeptic follows. */}
      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>Document:</span>
          <Link
            to="/v2/library/$documentId"
            params={{ documentId: event.document_id }}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            {event.document_title}
            <ArrowRight className="size-3" />
          </Link>
        </div>
        {event.specialist_name ? (
          <span>Specialist: {event.specialist_name}</span>
        ) : null}
        {event.confidence_band ? (
          <span>
            Match: {event.confidence_band}
            {event.score !== null ? ` (${event.score.toFixed(2)})` : ""}
          </span>
        ) : null}
        {event.match_reasons.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            <span>Why:</span>
            {event.match_reasons.map((reason) => (
              <Badge key={reason} variant="secondary" className="normal-case">
                {reason}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          {event.session_id ? (
            <span>session {event.session_id.slice(0, 8)}</span>
          ) : null}
          {event.query_id ? (
            <span>query {event.query_id.slice(0, 8)}</span>
          ) : null}
          <span>{occurred}</span>
        </div>
      </div>
    </div>
  )
}
