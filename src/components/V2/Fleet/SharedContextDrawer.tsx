import { useQuery } from "@tanstack/react-query"
import { FileText, Zap } from "lucide-react"
import { useState } from "react"
import {
  readTaskforceFleetSessionContext,
  type TaskforceFleetSession,
  type TaskforceSessionContextEntry,
} from "@/api/v2Taskforce"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"
import {
  clientKind,
  clientLabel,
  fleetTitle,
  type AgentKind,
} from "./fleetStatus"

const CHIP_CLASS: Record<AgentKind, string> = {
  claude: styles.chipClaude,
  codex: styles.chipCodex,
  cursor: styles.chipCursor,
  other: styles.chipOther,
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

/** Read-only session context drawer for one session group.
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
          aria-label={`Session context for ${fleetTitle(fleet)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <FileText aria-hidden="true" />
          <span className={styles.fctxLabel}>Session context</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn("w-full gap-0 p-0 sm:max-w-none", styles.ctxDrawer)}
        data-testid="fleet-context-drawer"
      >
        <div className={cn(styles.ctxPanel, styles.ctxPanelHeader)}>
          <div className={styles.ctxGrid}>
            <span className={styles.ctxLead}>
              <span className={styles.ctxIcon}>
                <FileText aria-hidden="true" />
              </span>
            </span>
            <div className={styles.ctxCol}>
              <h2 className={styles.ctxTitle}>Session context</h2>
              <p className={styles.ctxScope}>
                {data?.scope ?? fleetTitle(fleet)}
              </p>
            </div>
          </div>
          <div className={styles.ctxGrid}>
            <span className={styles.ctxLead}>
              <span className={styles.ctxIcon}>
                <Zap aria-hidden="true" />
              </span>
            </span>
            <div className={styles.ctxCol}>
              <p className={styles.ctxInjectText}>
                Injected into this group's agents each turn, up to{" "}
                <b>
                  {(data?.inject_token_budget ?? 2000).toLocaleString()} tokens
                </b>
                .
              </p>
              {data && (
                <div className={styles.ctxMeta}>
                  <span>
                    {data.entry_count}{" "}
                    {data.entry_count === 1 ? "document" : "documents"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>~{data.token_estimate.toLocaleString()} tokens</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn(styles.ctxPanel, styles.ctxPanelBody)}>
          {query.isLoading ? (
            <div className={styles.ctxLoading}>
              {[0, 1, 2].map((item) => (
                <div key={item} className={styles.ctxGrid}>
                  <span className={styles.ctxLead} aria-hidden="true" />
                  <div className={styles.ctxLoadingRow} />
                </div>
              ))}
            </div>
          ) : query.error ? (
            <div className={styles.ctxGrid}>
              <span className={styles.ctxLead} aria-hidden="true" />
              <p className={styles.ctxErrorText}>
                Session context could not load.
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className={styles.ctxGrid}>
              <span className={styles.ctxLead} aria-hidden="true" />
              <p className={styles.ctxEmptyText}>
                No session context yet. As this group's agents capture work,
                their documents appear here and are injected into each agent's
                turn.
              </p>
            </div>
          ) : (
            <ul className={styles.ctxList}>
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
  const kind = clientKind(entry.produced_by_client)
  return (
    <li className={styles.ctxEntry} data-testid="fleet-context-entry">
      <div className={styles.ctxGrid}>
        <span className={styles.ctxLead}>
          <span className={cn(styles.ctxBadge, CHIP_CLASS[kind])}>
            {clientLabel(entry.produced_by_client)}
          </span>
        </span>
        <div className={styles.ctxCol}>
          <div className={styles.ctxEntryHeader}>
            <span className={styles.ctxEntryTitle}>{entry.title}</span>
            <span className={styles.ctxEntryTime}>
              {timeAgo(entry.last_touched_at)}
            </span>
          </div>
          {entry.summary_markdown && (
            <p className={styles.ctxEntrySummary}>{entry.summary_markdown}</p>
          )}
          {entry.outcome && (
            <p className={styles.ctxOutcome}>Outcome: {entry.outcome}</p>
          )}
        </div>
      </div>
    </li>
  )
}
