import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Terminal,
} from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  type LedgerSessionDetail,
  type LedgerSessionRow,
  type LedgerTranscriptEvent,
  readLedger,
  readLedgerSessionDetail,
} from "@/api/v2Ledger"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCompactNumber } from "@/components/V2/Agents/formatters"
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

type LedgerSort = "newest" | "oldest"

type LedgerSearchFilters = {
  actor_id?: string
  client?: string
  cross_boundary?: boolean
  q?: string
  session_id?: string
  specialist?: string
  sort?: LedgerSort
}

type DayGroup = {
  key: string
  label: string
  rows: LedgerSessionRow[]
}

function clientLabel(value: string | null | undefined): string {
  if (!value) return "Unknown"
  return CLIENT_LABELS[value] ?? value
}

function cleanLedgerSearch(filters: LedgerSearchFilters): LedgerSearchFilters {
  return {
    actor_id: filters.actor_id || undefined,
    client: filters.client || undefined,
    cross_boundary: filters.cross_boundary || undefined,
    q: filters.q || undefined,
    session_id: filters.session_id || undefined,
    specialist: filters.specialist || undefined,
    sort: filters.sort === "oldest" ? "oldest" : undefined,
  }
}

function dateFrom(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatClock(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDateTime(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "—"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDuration(durationMs: number): string {
  if (!durationMs) return "—"
  const minutes = Math.max(1, Math.round(durationMs / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function dayKey(value: string): string {
  const date = dateFrom(value)
  if (!date) return "unknown"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dayLabel(key: string): string {
  if (key === "unknown") return "Undated"
  const today = dayKey(new Date().toISOString())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dayKey(yesterday.toISOString())
  if (key === today) return "Today"
  if (key === yesterdayKey) return "Yesterday"
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function groupRows(rows: LedgerSessionRow[]): DayGroup[] {
  const groups = new Map<string, LedgerSessionRow[]>()
  for (const row of rows) {
    const key = dayKey(row.started_at ?? row.occurred_at_last)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return Array.from(groups.entries()).map(([key, groupRows]) => ({
    key,
    label: dayLabel(key),
    rows: groupRows,
  }))
}

function sessionTitle(row: LedgerSessionRow): string {
  return (
    row.title ||
    row.documents[0]?.title ||
    `Session ${row.short_session_id ?? row.session_id.slice(0, 8)}`
  )
}

function agentLabel(row: LedgerSessionRow): string {
  return row.model_id || row.specialist_name || row.specialist_slug || "Agent"
}

function buildMarkdown(detail: LedgerSessionDetail): string {
  const lines = [
    `# ${sessionTitle(detail)}`,
    "",
    `Session: ${detail.session_id}`,
    `Harness: ${clientLabel(detail.harness_label ?? detail.client)}`,
    `Agent: ${agentLabel(detail)}`,
    `Started: ${formatDateTime(detail.started_at ?? detail.occurred_at_first)}`,
    "",
    "## Transcript",
    "",
  ]
  for (const event of detail.transcript_events) {
    const label = event.kind.toUpperCase()
    const body = event.text || event.cmd || event.file || event.note || ""
    lines.push(`### ${label} · ${formatDateTime(event.occurred_at)}`)
    lines.push(body)
    lines.push("")
  }
  return lines.join("\n")
}

export function LedgerPage({
  searchFilters,
}: {
  searchFilters: LedgerSearchFilters
}) {
  const { isDemoMode } = useDemoMode()
  const navigate = useNavigate({ from: "/v2/ledger" })
  const query = searchFilters.q?.trim() ?? ""
  const crossOnly = searchFilters.cross_boundary === true
  const specialist = searchFilters.specialist?.trim() || undefined
  const client = searchFilters.client?.trim() || undefined
  const actorId = searchFilters.actor_id?.trim() || undefined
  const selectedSessionId = searchFilters.session_id?.trim() || undefined
  const sort = searchFilters.sort === "oldest" ? "oldest" : "newest"
  const [search, setSearch] = useState(query)

  useEffect(() => {
    setSearch(query)
  }, [query])

  const setLedgerSearch = useCallback(
    (next: Partial<LedgerSearchFilters>) => {
      void navigate({
        to: "/v2/ledger",
        search: cleanLedgerSearch({ ...searchFilters, ...next }),
      })
    },
    [navigate, searchFilters],
  )

  const ledgerQuery = useQuery({
    queryKey: [
      "v2-ledger",
      {
        actorId,
        client,
        crossOnly,
        demo: isDemoMode,
        q: query,
        sort,
        specialist,
      },
    ],
    queryFn: () =>
      readLedger({
        actorId,
        client,
        demo: isDemoMode,
        q: query || undefined,
        crossBoundary: crossOnly || undefined,
        specialist,
        sort,
      }),
  })

  const detailQuery = useQuery({
    enabled: Boolean(selectedSessionId),
    queryKey: ["v2-ledger-detail", selectedSessionId, isDemoMode],
    queryFn: () =>
      readLedgerSessionDetail(selectedSessionId ?? "", { demo: isDemoMode }),
  })

  useEffect(() => {
    if (!selectedSessionId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLedgerSearch({ session_id: undefined })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedSessionId, setLedgerSearch])

  const rows = ledgerQuery.data?.rows ?? []
  const groups = useMemo(() => groupRows(rows), [rows])

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    setLedgerSearch({ q: search.trim() || undefined, session_id: undefined })
  }

  const hasActiveFilters = Boolean(
    actorId || client || crossOnly || query || specialist || sort === "oldest",
  )

  return (
    <section
      className={cn(V2_PAGE_FRAME, "bg-background font-sans text-foreground")}
    >
      <div className={cn(V2_PAGE_CONTENT, "gap-5")}>
        {selectedSessionId ? (
          <LedgerDetailView
            detail={detailQuery.data}
            isError={detailQuery.isError}
            isLoading={detailQuery.isLoading}
            onBack={() => setLedgerSearch({ session_id: undefined })}
          />
        ) : (
          <>
            <LedgerHeader total={ledgerQuery.data?.total} />
            <LedgerToolbar
              client={client}
              crossOnly={crossOnly}
              hasActiveFilters={hasActiveFilters}
              isFetching={ledgerQuery.isFetching && !ledgerQuery.isLoading}
              onClear={() =>
                setLedgerSearch({
                  actor_id: undefined,
                  client: undefined,
                  cross_boundary: undefined,
                  q: undefined,
                  session_id: undefined,
                  specialist: undefined,
                  sort: undefined,
                })
              }
              onClientChange={(value) =>
                setLedgerSearch({
                  client: value === "all" ? undefined : value,
                  session_id: undefined,
                })
              }
              onCrossChange={() =>
                setLedgerSearch({
                  cross_boundary: crossOnly ? undefined : true,
                  session_id: undefined,
                })
              }
              onSearchSubmit={onSearchSubmit}
              onSearchValueChange={setSearch}
              onSortChange={(value) =>
                setLedgerSearch({
                  session_id: undefined,
                  sort: value as LedgerSort,
                })
              }
              query={query}
              search={search}
              sort={sort}
              specialist={specialist}
            />
            <LedgerIndex
              groups={groups}
              isError={ledgerQuery.isError}
              isLoading={ledgerQuery.isLoading}
              onOpenSession={(sessionId) =>
                setLedgerSearch({ session_id: sessionId })
              }
            />
          </>
        )}
      </div>
    </section>
  )
}

function LedgerHeader({ total }: { total?: number }) {
  return (
    <header className="flex flex-col gap-1">
      <span className={V2_TAB_EYEBROW_CLASS}>
        Ledger{typeof total === "number" ? ` · ${total} sessions archived` : ""}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
    </header>
  )
}

function LedgerToolbar({
  client,
  crossOnly,
  hasActiveFilters,
  isFetching,
  onClear,
  onClientChange,
  onCrossChange,
  onSearchSubmit,
  onSearchValueChange,
  onSortChange,
  query,
  search,
  sort,
  specialist,
}: {
  client?: string
  crossOnly: boolean
  hasActiveFilters: boolean
  isFetching: boolean
  onClear: () => void
  onClientChange: (value: string) => void
  onCrossChange: () => void
  onSearchSubmit: (event: FormEvent) => void
  onSearchValueChange: (value: string) => void
  onSortChange: (value: string) => void
  query: string
  search: string
  sort: LedgerSort
  specialist?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={onSearchSubmit} className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9 font-mono text-sm"
          placeholder="/ Search transcripts, commands, files..."
          value={search}
          onChange={(event) => onSearchValueChange(event.target.value)}
        />
      </form>
      <Select value={client ?? "all"} onValueChange={onClientChange}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All harnesses</SelectItem>
          <SelectItem value="codex">Codex</SelectItem>
          <SelectItem value="claude-code">Claude Code</SelectItem>
          <SelectItem value="cursor">Cursor</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant={crossOnly ? "default" : "outline"}
        size="sm"
        onClick={onCrossChange}
        aria-pressed={crossOnly}
      >
        <ArrowLeftRight className="size-4" />
        Cross
      </Button>
      {specialist ? (
        <Badge variant="outline">Profile · {specialist}</Badge>
      ) : null}
      {query ? <Badge variant="outline">Search · {query}</Badge> : null}
      {hasActiveFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      ) : null}
      {isFetching ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Refreshing
        </span>
      ) : null}
    </div>
  )
}

function LedgerIndex({
  groups,
  isError,
  isLoading,
  onOpenSession,
}: {
  groups: DayGroup[]
  isError: boolean
  isLoading: boolean
  onOpenSession: (sessionId: string) => void
}) {
  if (isError) {
    return (
      <div className="rounded-md border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
        Couldn't load the organization ledger.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading sessions...
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
        No sessions match.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <div className="min-w-[960px]">
        <div className="sticky top-0 z-10 grid grid-cols-[86px_minmax(220px,1.6fr)_168px_150px_minmax(160px,1fr)_32px] border-b border-border bg-muted/80 px-4 py-2 text-[11px] font-medium uppercase text-muted-foreground">
          <div>Time</div>
          <div>Session</div>
          <div>Harness · agent</div>
          <div>Activity</div>
          <div>Referenced by</div>
          <div />
        </div>
        {groups.map((group) => (
          <div key={group.key}>
            <div className="border-b border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground">
              {group.label} · {group.rows.length}
            </div>
            {group.rows.map((row) => (
              <LedgerRow
                key={row.session_id}
                row={row}
                onOpen={() => onOpenSession(row.session_id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function LedgerRow({
  onOpen,
  row,
}: {
  onOpen: () => void
  row: LedgerSessionRow
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[86px_minmax(220px,1.6fr)_168px_150px_minmax(160px,1fr)_32px] items-center border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/45"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium tabular-nums">
          {formatClock(row.started_at ?? row.occurred_at_last)}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {row.started_at ? "local" : "latest"}
        </div>
      </div>
      <div className="min-w-0 pr-4">
        <div className="truncate text-sm font-medium">{sessionTitle(row)}</div>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 font-mono">
            {row.short_session_id ?? row.session_id.slice(0, 8)}
          </span>
          <span className="truncate">{row.actor_handle ?? row.actor_name}</span>
          {row.branch ? <span className="truncate">· {row.branch}</span> : null}
        </div>
      </div>
      <div className="min-w-0 pr-4">
        <div className="truncate text-sm">
          {clientLabel(row.harness_label ?? row.client)}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {agentLabel(row)}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 pr-4 text-xs text-muted-foreground">
        <ActivityPill
          count={row.message_count || row.event_count}
          label="msg"
        />
        <ActivityPill count={row.command_count} label="cmd" />
        <ActivityPill count={row.edit_count} label="edit" />
      </div>
      <div className="min-w-0 pr-4">
        {row.documents.length > 0 ? (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm">{row.documents[0].title}</span>
            {row.documents.length > 1 ? (
              <Badge variant="outline" className="h-5 px-1 text-[10px]">
                +{row.documents.length - 1}
              </Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )}
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

function ActivityPill({ count, label }: { count: number; label: string }) {
  return (
    <span className="rounded border border-border bg-background px-1.5 py-0.5 tabular-nums">
      {formatCompactNumber(count)} {label}
    </span>
  )
}

function LedgerDetailView({
  detail,
  isError,
  isLoading,
  onBack,
}: {
  detail?: LedgerSessionDetail
  isError: boolean
  isLoading: boolean
  onBack: () => void
}) {
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading session...
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back to Ledger
        </Button>
        <div className="rounded-md border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
          Couldn't load this session.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to Ledger
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {detail.session_id}
        </span>
        <Badge variant="outline">
          {clientLabel(detail.harness_label ?? detail.client)}
        </Badge>
        <Badge variant="secondary">{agentLabel(detail)}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_296px]">
        <main className="min-w-0">
          <div className="mb-4">
            <span className={V2_TAB_EYEBROW_CLASS}>
              {formatDateTime(detail.started_at ?? detail.occurred_at_first)}
            </span>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {sessionTitle(detail)}
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            {detail.transcript_events.length > 0 ? (
              detail.transcript_events.map((event, index) => (
                <TranscriptEventCard
                  key={`${event.kind}-${event.occurred_at ?? index}-${index}`}
                  event={event}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-8 text-sm text-muted-foreground">
                Transcript archive is not available for this older session.
              </div>
            )}
          </div>
        </main>
        <SessionRail detail={detail} />
      </div>
    </div>
  )
}

function TranscriptEventCard({ event }: { event: LedgerTranscriptEvent }) {
  const title =
    event.kind === "command"
      ? "Command"
      : event.kind === "edit"
        ? "Edit"
        : event.kind === "note"
          ? "Note"
          : event.kind === "prompt"
            ? "Prompt"
            : "Reply"

  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {event.kind === "command" ? (
            <Terminal className="size-4 text-muted-foreground" />
          ) : event.kind === "edit" ? (
            <FileText className="size-4 text-muted-foreground" />
          ) : null}
          <span>{title}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatClock(event.occurred_at)}
        </span>
      </div>
      {event.kind === "command" ? (
        <div className="space-y-2">
          <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
            {event.cmd}
          </pre>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {event.exit_code === null ? null : (
              <Badge
                variant={event.exit_code === 0 ? "secondary" : "destructive"}
              >
                exit {event.exit_code}
              </Badge>
            )}
            {event.repo ? <span>{event.repo}</span> : null}
          </div>
          {event.output ? (
            <pre className="overflow-x-auto rounded border border-border p-3 font-mono text-xs text-muted-foreground">
              {event.output}
            </pre>
          ) : null}
        </div>
      ) : event.kind === "edit" ? (
        <div className="space-y-2">
          <div className="font-mono text-sm">{event.file}</div>
          {event.note ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {event.note}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {event.text || event.note || "—"}
        </p>
      )}
    </article>
  )
}

function SessionRail({ detail }: { detail: LedgerSessionDetail }) {
  const copyMarkdown = () => {
    void navigator.clipboard?.writeText(buildMarkdown(detail))
  }

  return (
    <aside className="flex flex-col gap-4">
      <RailSection title="Session">
        <RailRow
          label="ID"
          value={detail.short_session_id ?? detail.session_id.slice(0, 8)}
        />
        <RailRow
          label="Actor"
          value={detail.actor_handle ?? detail.actor_name}
        />
        <RailRow
          label="Harness"
          value={clientLabel(detail.harness_label ?? detail.client)}
        />
        <RailRow label="Agent" value={agentLabel(detail)} />
        <RailRow label="Repo" value={detail.repo ?? "—"} />
      </RailSection>
      <RailSection title="Timing">
        <RailRow
          label="Started"
          value={formatDateTime(detail.started_at ?? detail.occurred_at_first)}
        />
        <RailRow
          label="Ended"
          value={formatDateTime(detail.ended_at ?? detail.occurred_at_last)}
        />
        <RailRow label="Duration" value={formatDuration(detail.duration_ms)} />
      </RailSection>
      <RailSection title="Activity">
        <RailRow
          label="Messages"
          value={String(detail.message_count || detail.event_count)}
        />
        <RailRow label="Commands" value={String(detail.command_count)} />
        <RailRow label="Edits" value={String(detail.edit_count)} />
        <RailRow
          label="Tokens"
          value={`${formatCompactNumber(detail.input_tokens + detail.output_tokens)}`}
        />
      </RailSection>
      <RailSection title="Referenced by">
        {detail.documents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {detail.documents.map((doc) => (
              <Link
                key={doc.document_id}
                to="/v2/library/$documentId"
                params={{ documentId: doc.document_id }}
                className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="truncate">{doc.title}</span>
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )}
      </RailSection>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!detail.raw_transcript_available}
        >
          <ExternalLink className="size-4" />
          Open raw transcript
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyMarkdown}
        >
          <Copy className="size-4" />
          Copy as Markdown
        </Button>
      </div>
    </aside>
  )
}

function RailSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="border-b border-border pb-4">
      <h2 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  )
}
