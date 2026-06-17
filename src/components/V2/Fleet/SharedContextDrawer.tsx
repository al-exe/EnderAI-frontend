import { useQuery } from "@tanstack/react-query"
import { FileText, Zap } from "lucide-react"
import { useState } from "react"
import {
  readTaskforceFleetSessionContext,
  type TaskforceFleetSession,
  type TaskforceSessionContextEntry,
} from "@/api/v2Taskforce"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import styles from "./FleetPage.module.css"
import { fleetTitle } from "./fleetStatus"

// The harness that produced a document, mapped to the same short labels the
// roster row chips use. Falls back to the raw client string when unknown.
const CLIENT_LABEL: Record<string, string> = {
  "claude-code": "Claude",
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
}

function clientLabel(value: string | null): string {
  if (!value) return "Agent"
  return CLIENT_LABEL[value] ?? value
}

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** Read-only "shared context" drawer for one session group.
 *
 * Surfaces the documents the group's agents have produced (served by
 * GET /v2/taskforce/fleet/{id}/context). The feed is fetched lazily on open
 * so the roster doesn't fire one request per group on every poll. */
export function SharedContextDrawer({
  fleet,
}: {
  fleet: TaskforceFleetSession
}) {
  const [open, setOpen] = useState(false)
  const query = useQuery({
    queryKey: ["v2-taskforce-fleet-context", fleet.id],
    queryFn: () => readTaskforceFleetSessionContext(fleet.id),
    enabled: open,
  })

  const data = query.data
  const entries = data?.entries ?? []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={styles.fctx}
          aria-label={`Shared context for ${fleetTitle(fleet)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <FileText aria-hidden="true" />
          <span className={styles.fctxLabel}>Shared context</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        data-testid="fleet-context-drawer"
      >
        <div className="border-border border-b p-5">
          <div className="flex items-center gap-3">
            <span className={styles.ctxIcon}>
              <FileText aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                Shared context
              </h2>
              <p className="text-muted-foreground truncate font-mono text-xs">
                {data?.scope ?? fleetTitle(fleet)}
              </p>
            </div>
          </div>
          <div className={styles.ctxInject}>
            <Zap aria-hidden="true" />
            <span>
              Injected into this group's agents each turn, up to{" "}
              <b>
                {(data?.inject_token_budget ?? 2000).toLocaleString()} tokens
              </b>
              .
            </span>
          </div>
          {data && (
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px]">
              <span>
                {data.entry_count}{" "}
                {data.entry_count === 1 ? "document" : "documents"}
              </span>
              <span aria-hidden="true">·</span>
              <span>~{data.token_estimate.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {query.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="border-border bg-muted/20 h-20 animate-pulse border"
                />
              ))}
            </div>
          ) : query.error ? (
            <p className="text-destructive text-sm">
              Shared context could not load.
            </p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              No shared context yet. As this group's agents capture work, their
              documents appear here and are injected into each agent's turn.
            </p>
          ) : (
            <ul className="flex flex-col">
              {entries.map((entry) => (
                <ContextEntry key={entry.document_id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ContextEntry({ entry }: { entry: TaskforceSessionContextEntry }) {
  return (
    <li className={styles.ctxEntry} data-testid="fleet-context-entry">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={styles.ctxBadge}>
          {clientLabel(entry.produced_by_client)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {entry.title}
        </span>
        <span className="text-muted-foreground shrink-0 font-mono text-[10.5px]">
          {timeAgo(entry.last_touched_at)}
        </span>
      </div>
      {entry.summary_markdown && (
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {entry.summary_markdown}
        </p>
      )}
      {entry.outcome && (
        <p className={styles.ctxOutcome}>Outcome: {entry.outcome}</p>
      )}
    </li>
  )
}
