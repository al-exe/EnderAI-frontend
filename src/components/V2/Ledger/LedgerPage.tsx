import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeftRight, Loader2, Search } from "lucide-react"
import { useState } from "react"

import { readLedger } from "@/api/v2Ledger"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatCompactNumber,
  formatRelativeTime,
  formatUsd,
} from "@/components/V2/Agents/formatters"
import {
  V2_PAGE_CONTENT,
  V2_PAGE_FRAME,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"

const CLIENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
}

function clientLabel(value: string | null): string {
  if (!value) return "—"
  return CLIENT_LABELS[value] ?? value
}

export function LedgerPage() {
  const { isDemoMode } = useDemoMode()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [crossOnly, setCrossOnly] = useState(false)

  const ledgerQuery = useQuery({
    queryKey: ["v2-ledger", { demo: isDemoMode, q: query, crossOnly }],
    queryFn: () =>
      readLedger({
        demo: isDemoMode,
        q: query || undefined,
        crossBoundary: crossOnly || undefined,
      }),
  })

  const data = ledgerQuery.data
  const rows = data?.rows ?? []

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setQuery(search.trim())
  }

  return (
    <section
      className={cn(V2_PAGE_FRAME, "bg-background font-sans text-foreground")}
    >
      <div className={V2_PAGE_CONTENT}>
        <header className="flex flex-col gap-2">
          <span className={V2_TAB_EYEBROW_CLASS}>
            Ledger{data ? ` · ${data.total} sessions` : ""}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Every session your team runs through a Taskforce-enabled tool — what
            was done, what it reused, and what it saved. The raw record the
            Library and Profiles are distilled from.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={onSearchSubmit} className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search sessions (prompt or document)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <Button
            type="button"
            variant={crossOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setCrossOnly((value) => !value)}
            aria-pressed={crossOnly}
          >
            <ArrowLeftRight className="size-4" />
            Cross-boundary only
          </Button>
        </div>

        {ledgerQuery.isError ? (
          <div className="rounded-lg border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
            Couldn't load the ledger. This view is organization-scoped — you
            need to belong to an organization.
          </div>
        ) : ledgerQuery.isLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading sessions…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center">
            <h2 className="text-base font-semibold">No sessions yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {crossOnly
                ? "No cross-boundary sessions match. Clear the filter to see all sessions."
                : "Sessions appear here as your team works through Taskforce-enabled tools."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Who · tool</TableHead>
                  <TableHead>Worked on</TableHead>
                  <TableHead>Specialist</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.session_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.actor_name}</span>
                        {row.cross_boundary ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 normal-case"
                            title="Crossed a person or tool boundary"
                          >
                            <ArrowLeftRight className="size-3" />
                            cross
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {clientLabel(row.client)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {row.documents.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {row.documents.slice(0, 3).map((doc) => (
                            <Link
                              key={doc.document_id}
                              to="/v2/library/$documentId"
                              params={{ documentId: doc.document_id }}
                              className="truncate text-sm text-foreground hover:underline"
                            >
                              {doc.title}
                            </Link>
                          ))}
                          {row.documents.length > 3 ? (
                            <span className="text-xs text-muted-foreground">
                              +{row.documents.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.specialist_slug ? (
                        <Link
                          to="/v2/agents/$slug"
                          params={{ slug: row.specialist_slug }}
                          className="text-sm text-foreground hover:underline"
                        >
                          {row.specialist_name ?? row.specialist_slug}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm tabular-nums">
                        {formatCompactNumber(row.net_saved_tokens)} tok
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {formatUsd(row.usd_amount)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {formatRelativeTime(row.occurred_at_last)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {ledgerQuery.isFetching && !ledgerQuery.isLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Refreshing
          </div>
        ) : null}
      </div>
    </section>
  )
}
