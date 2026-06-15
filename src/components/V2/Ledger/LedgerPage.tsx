import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  type LedgerDocRef,
  type LedgerSessionDetail,
  type LedgerSessionRow,
  type LedgerTranscriptEvent,
  readLedger,
  readLedgerRawTranscript,
  readLedgerSessionDetail,
} from "@/api/v2Ledger"
import { useDemoMode } from "@/components/demo-mode-provider"
import { formatCompactNumber } from "@/components/V2/Agents/formatters"
import { ScopeFilterBar } from "@/components/V2/ScopeFilterBar"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"

import styles from "./LedgerPage.module.css"

const GRID = "100px minmax(0,1.6fr) 188px 204px minmax(0,1fr) 20px"

const CLIENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
}

const HARNESS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "claude-code", label: "Claude Code" },
  { value: "codex", label: "Codex" },
  { value: "cursor", label: "Cursor" },
  { value: "other", label: "Other" },
]

type LedgerSort = "newest" | "oldest"

type LedgerSearchFilters = {
  actor_id?: string
  client?: string
  cross_boundary?: boolean
  event_id?: string
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
  return CLIENT_LABELS[value] ?? "Other"
}

function cleanLedgerSearch(filters: LedgerSearchFilters): LedgerSearchFilters {
  return {
    actor_id: filters.actor_id || undefined,
    client: filters.client || undefined,
    cross_boundary: filters.cross_boundary || undefined,
    event_id: filters.session_id ? filters.event_id || undefined : undefined,
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

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** "14:02" */
function formatClock(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "—"
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "14:02:11" */
function formatTimeOfDay(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "—"
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "2026-06-01 14:02:11" */
function formatStamp(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "—"
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "Tue Jun 1 2026" */
function formatDateLong(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return ""
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(date)
    .replace(/,/g, "")
}

/** Short timezone label for the clock subscript, e.g. "PDT" / "GMT-7". */
function timeZoneLabel(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return ""
  const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(date)
    .find((entry) => entry.type === "timeZoneName")
  return part?.value ?? ""
}

/** "18m 58s" / "1h 5m" / "42s" */
function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs < 0) return "—"
  const totalSeconds = Math.round(durationMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function dayKey(value: string | null | undefined): string {
  const date = dateFrom(value)
  if (!date) return "unknown"
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayLabel(key: string): string {
  if (key === "unknown") return "Undated"
  const now = new Date()
  const todayKey = dayKey(now.toISOString())
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dayKey(yesterday.toISOString())
  const date = new Date(`${key}T00:00:00`)
  const long = Number.isNaN(date.getTime())
    ? key
    : new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
        .format(date)
        .replace(/,/g, "")
  if (key === todayKey) return `Today · ${long}`
  if (key === yesterdayKey) return `Yesterday · ${long}`
  return long
}

function groupRows(rows: LedgerSessionRow[]): DayGroup[] {
  const order: string[] = []
  const groups = new Map<string, LedgerSessionRow[]>()
  for (const row of rows) {
    const key = dayKey(row.started_at ?? row.occurred_at_last)
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)?.push(row)
  }
  return order.map((key) => ({
    key,
    label: dayLabel(key),
    rows: groups.get(key) ?? [],
  }))
}

function shortId(row: LedgerSessionRow): string {
  return row.short_session_id ?? row.session_id.slice(0, 8)
}

function sessionTitle(row: LedgerSessionRow): string {
  return row.title || row.documents[0]?.title || `Session ${shortId(row)}`
}

function agentLabel(row: LedgerSessionRow): string {
  return row.model_id || row.specialist_name || row.specialist_slug || "Agent"
}

function whoLabel(row: LedgerSessionRow): string {
  return row.actor_handle ?? row.actor_name ?? "Unknown"
}

function userDisplayLabel(row: LedgerSessionRow): string {
  const handle = row.actor_handle?.trim()
  const name = row.actor_name?.trim()
  if (handle && name && handle !== name) {
    return `${handle} · ${name}`
  }
  return whoLabel(row)
}

function eventWho(event: LedgerTranscriptEvent, row: LedgerSessionRow): string {
  return event.who ?? whoLabel(row)
}

function harnessWithVersion(row: LedgerSessionRow): string {
  const label = clientLabel(row.harness_label ?? row.client)
  return row.harness_version ? `${label} ${row.harness_version}` : label
}

function tokenSummary(detail: LedgerSessionDetail): string {
  return `${formatCompactNumber(detail.input_tokens)} in · ${formatCompactNumber(detail.output_tokens)} out`
}

function buildMarkdown(detail: LedgerSessionDetail): string {
  const lines = [
    `# ${sessionTitle(detail)}`,
    "",
    `- Session: ${detail.session_id}`,
    `- User: ${whoLabel(detail)}`,
    `- Harness: ${harnessWithVersion(detail)}`,
    `- Agent: ${agentLabel(detail)}`,
    `- Started: ${formatStamp(detail.started_at ?? detail.occurred_at_first)}`,
    `- Ended: ${formatStamp(detail.ended_at ?? detail.occurred_at_last)}`,
    "",
    "## Transcript",
    "",
  ]
  for (const event of detail.transcript_events) {
    const time = formatTimeOfDay(event.occurred_at)
    if (event.kind === "prompt") {
      lines.push(
        `**${time} · ${eventWho(event, detail)} asked**`,
        "",
        event.text ?? "",
        "",
      )
    } else if (event.kind === "reply") {
      lines.push(
        `**${time} · ${agentLabel(detail)} replied**`,
        "",
        event.text ?? "",
        "",
      )
    } else if (event.kind === "command") {
      lines.push(
        `**${time} · ran command**`,
        "",
        "```",
        event.cmd ?? "",
        event.output ?? "",
        "```",
        "",
      )
    } else if (event.kind === "edit") {
      lines.push(
        `**${time} · edited ${event.file ?? ""}** (+${event.added ?? 0} −${event.removed ?? 0})`,
        "",
        event.note ?? "",
        "",
      )
    } else {
      lines.push(`> ${time} · ${event.note ?? event.text ?? ""}`, "")
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n")
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
  const sort: LedgerSort = searchFilters.sort === "oldest" ? "oldest" : "newest"
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
        setLedgerSearch({ event_id: undefined, session_id: undefined })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedSessionId, setLedgerSearch])

  const rows = ledgerQuery.data?.rows ?? []
  const groups = useMemo(() => groupRows(rows), [rows])

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    setLedgerSearch({
      event_id: undefined,
      q: search.trim() || undefined,
      session_id: undefined,
    })
  }

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div className={cn(V2_PAGE_BODY, selectedSessionId && "pb-0")}>
        {selectedSessionId ? (
          <div className={styles.app}>
            <LedgerDetail
              anchorEventId={searchFilters.event_id}
              detail={detailQuery.data}
              demo={isDemoMode}
              isError={detailQuery.isError}
              isLoading={detailQuery.isLoading}
              onBack={() =>
                setLedgerSearch({ event_id: undefined, session_id: undefined })
              }
            />
          </div>
        ) : (
          <div
            className={styles.app}
            style={{ "--grid": GRID } as CSSProperties}
          >
            <div
              className={cn(
                V2_STICKY_HEADER_CLASS,
                "border-b-0 pb-0",
                "flex flex-col gap-6",
              )}
            >
              <header className={styles.head}>
                <div>
                  <div className={styles.crumb}>
                    {typeof ledgerQuery.data?.total === "number"
                      ? `${ledgerQuery.data.total} sessions archived`
                      : null}
                  </div>
                  <h1 className={styles.h1}>Ledger</h1>
                </div>
                <div className={styles.tools}>
                  <form className={styles.search} onSubmit={onSearchSubmit}>
                    <input
                      className={styles.searchInput}
                      placeholder="/ Search transcripts, commands, files…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      aria-label="Search the ledger"
                    />
                  </form>
                </div>
              </header>

              <div>
                <ScopeFilterBar
                  items={HARNESS_OPTIONS.map((option) => ({
                    key: option.value,
                    label: option.label,
                  }))}
                  active={client ?? "all"}
                  onChange={(value) =>
                    setLedgerSearch({
                      client: value === "all" ? undefined : value,
                      session_id: undefined,
                    })
                  }
                  sortLabel={`recent ${sort === "newest" ? "↓" : "↑"}`}
                  onSortToggle={() =>
                    setLedgerSearch({
                      session_id: undefined,
                      sort: sort === "newest" ? "oldest" : undefined,
                    })
                  }
                />
                <div className={styles.cols}>
                  <div>Time</div>
                  <div>Session</div>
                  <div>Harness · agent</div>
                  <div>Activity</div>
                  <div>Referenced by</div>
                  <div />
                </div>
              </div>
            </div>

            <div className={styles.listShell}>
              <LedgerList
                groups={groups}
                isError={ledgerQuery.isError}
                isLoading={ledgerQuery.isLoading}
                onOpenSession={(sessionId) =>
                  setLedgerSearch({
                    event_id: undefined,
                    session_id: sessionId,
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function LedgerList({
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
      <div className={styles.empty}>Couldn't load the organization ledger.</div>
    )
  }
  if (isLoading) {
    return (
      <div className={styles.status}>
        <Loader2 className={styles.spin} size={13} />
        Loading sessions…
      </div>
    )
  }
  if (groups.length === 0) {
    return <div className={styles.empty}>No sessions match.</div>
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.key}>
          <div className={styles.day}>
            <span className={styles.dayLbl}>{group.label}</span>
            <span className={styles.daySp} />
            <span className={styles.dayCt}>
              {group.rows.length} session{group.rows.length === 1 ? "" : "s"}
            </span>
          </div>
          {group.rows.map((row) => (
            <LedgerRow
              key={row.session_id}
              onOpen={() => onOpenSession(row.session_id)}
              row={row}
            />
          ))}
        </div>
      ))}
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
  const time = row.started_at ?? row.occurred_at_last
  const messages = row.message_count || row.event_count
  const tz = timeZoneLabel(time)
  return (
    <button className={styles.row} onClick={onOpen} type="button">
      <div className={styles.clock}>
        {formatClock(time)}
        {tz ? <small>{tz}</small> : null}
      </div>
      <div className={styles.main}>
        <div className={styles.ttl}>{sessionTitle(row)}</div>
        <div className={styles.sub}>
          <span className={styles.subId}>{shortId(row)}</span>
          <span className={styles.subDot}>·</span>
          <span className={styles.subWho}>{whoLabel(row)}</span>
          {row.branch ? (
            <>
              <span className={styles.subDot}>·</span>
              <span className={styles.subBranch}>⎇ {row.branch}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className={styles.harness}>
        <div className={styles.harnessH}>
          {clientLabel(row.harness_label ?? row.client)}
        </div>
        <div className={styles.harnessAg}>{agentLabel(row)}</div>
      </div>
      <div className={styles.act}>
        <span className={styles.actN}>{messages}</span> msgs ·{" "}
        <span className={styles.actN}>{row.command_count}</span> cmds ·{" "}
        <span className={styles.actN}>{row.edit_count}</span> edits
      </div>
      <div className={styles.backs}>
        {row.documents.length > 0 ? (
          <span className={styles.backsLink}>
            <span className={styles.backsMk} />
            <span className={styles.backsTt}>{row.documents[0].title}</span>
            {row.documents.length > 1 ? (
              <span className={styles.backsExtra}>
                +{row.documents.length - 1}
              </span>
            ) : null}
          </span>
        ) : (
          <span className={styles.backsNone}>—</span>
        )}
      </div>
      <div className={styles.chev}>›</div>
    </button>
  )
}

function eventIndex(
  events: LedgerTranscriptEvent[],
  eventId: string | undefined,
): number {
  if (!eventId) return -1
  return events.findIndex((event) => event.id === eventId)
}

function LedgerDetail({
  anchorEventId,
  detail,
  demo,
  isError,
  isLoading,
  onBack,
}: {
  anchorEventId?: string
  detail?: LedgerSessionDetail
  demo: boolean
  isError: boolean
  isLoading: boolean
  onBack: () => void
}) {
  const anchorIndex = useMemo(
    () => eventIndex(detail?.transcript_events ?? [], anchorEventId),
    [detail?.transcript_events, anchorEventId],
  )
  const anchorRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (anchorIndex >= 0) {
      anchorRef.current?.scrollIntoView({ block: "center" })
    }
  }, [anchorIndex])

  if (isLoading) {
    return (
      <div className={styles.detail}>
        <div className={styles.subbar}>
          <button className={styles.back} onClick={onBack} type="button">
            ← Ledger
          </button>
        </div>
        <div className={styles.status}>
          <Loader2 className={styles.spin} size={13} />
          Loading session…
        </div>
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className={styles.detail}>
        <div className={styles.subbar}>
          <button className={styles.back} onClick={onBack} type="button">
            ← Ledger
          </button>
        </div>
        <div className={styles.empty}>Couldn't load this session.</div>
      </div>
    )
  }

  return (
    <div className={styles.detail}>
      <div className={styles.subbar}>
        <button className={styles.back} onClick={onBack} type="button">
          ← Ledger
        </button>
        <span className={styles.idText}>{detail.session_id}</span>
        <span className={styles.subSp} />
        <span className={styles.pill}>{harnessWithVersion(detail)}</span>
        <span className={styles.pill}>{agentLabel(detail)}</span>
      </div>
      <div className={styles.dbody}>
        <div className={styles.transcript}>
          <div className={styles.tHead}>
            <div className={styles.eyebrow}>
              {formatDateLong(detail.started_at ?? detail.occurred_at_first)} ·{" "}
              {whoLabel(detail)} ·{" "}
              {clientLabel(detail.harness_label ?? detail.client)}
            </div>
            <h2>{sessionTitle(detail)}</h2>
          </div>
          {detail.transcript_events.length > 0 ? (
            detail.transcript_events.map((event, index) => (
              <TranscriptEvent
                anchorRef={index === anchorIndex ? anchorRef : undefined}
                detail={detail}
                event={event}
                highlighted={index === anchorIndex}
                key={event.id}
              />
            ))
          ) : (
            <div className={styles.empty}>
              Transcript archive is not available for this older session.
            </div>
          )}
        </div>
        <SessionRail demo={demo} detail={detail} />
      </div>
    </div>
  )
}

function TranscriptEvent({
  anchorRef,
  detail,
  event,
  highlighted,
}: {
  anchorRef?: RefObject<HTMLDivElement | null>
  detail: LedgerSessionDetail
  event: LedgerTranscriptEvent
  highlighted?: boolean
}) {
  const time = formatTimeOfDay(event.occurred_at)
  const anchorProps = { highlighted, rootRef: anchorRef }

  if (event.kind === "prompt") {
    return (
      <EventShell modifier={styles.evPrompt} time={time} {...anchorProps}>
        <div className={styles.lab}>
          <b>{eventWho(event, detail)} asked</b>
        </div>
        {event.text ? <div className={styles.txt}>{event.text}</div> : null}
      </EventShell>
    )
  }

  if (event.kind === "reply") {
    return (
      <EventShell modifier={styles.evReply} time={time} {...anchorProps}>
        <div className={styles.lab}>
          <b>{agentLabel(detail)}</b> replied
        </div>
        {event.text ? <div className={styles.txt}>{event.text}</div> : null}
      </EventShell>
    )
  }

  if (event.kind === "command") {
    const failed = event.exit_code !== null && event.exit_code !== 0
    const repo = event.repo ?? detail.repo
    return (
      <EventShell time={time} {...anchorProps}>
        <div className={styles.lab}>ran command</div>
        <div className={styles.cmd}>
          <div className={styles.cmdLine}>
            <span className={styles.cmdPr}>$</span>
            <span className={styles.cmdC}>{event.cmd}</span>
          </div>
          {event.output ? (
            <div className={styles.cmdOut}>{event.output}</div>
          ) : null}
          <div className={styles.cmdMeta}>
            {event.exit_code !== null ? (
              <span className={cn(styles.exit, failed && styles.exitFail)}>
                <span className={styles.exitD} />
                exit {event.exit_code}
              </span>
            ) : null}
            {repo ? <span>{repo}</span> : null}
          </div>
        </div>
      </EventShell>
    )
  }

  if (event.kind === "edit") {
    return (
      <EventShell time={time} {...anchorProps}>
        <div className={styles.lab}>edited file</div>
        <div className={styles.edit}>
          <span className={styles.editFile}>{event.file}</span>
          <span className={styles.editStat}>
            <span className={styles.editAdd}>+{event.added ?? 0}</span>{" "}
            <span className={styles.editRem}>−{event.removed ?? 0}</span>
          </span>
        </div>
        {event.note ? (
          <div className={styles.editNote}>{event.note}</div>
        ) : null}
      </EventShell>
    )
  }

  return (
    <EventShell modifier={styles.evNote} time={time} {...anchorProps}>
      <div className={styles.noteTxt}>● {event.note ?? event.text}</div>
    </EventShell>
  )
}

function EventShell({
  children,
  highlighted,
  modifier,
  rootRef,
  time,
}: {
  children: ReactNode
  highlighted?: boolean
  modifier?: string
  rootRef?: RefObject<HTMLDivElement | null>
  time: string
}) {
  return (
    <div
      className={cn(styles.ev, modifier, highlighted && styles.evHighlight)}
      data-highlighted={highlighted ? "true" : undefined}
      ref={rootRef}
    >
      <div className={styles.evT}>{time}</div>
      <div className={styles.evC}>{children}</div>
    </div>
  )
}

function SessionRail({
  demo,
  detail,
}: {
  demo: boolean
  detail: LedgerSessionDetail
}) {
  const [downloadError, setDownloadError] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)

  const copyMarkdown = () => {
    void navigator.clipboard?.writeText(buildMarkdown(detail))
  }

  const downloadRawTranscript = async () => {
    setDownloadError("")
    setIsDownloading(true)
    try {
      const transcript = await readLedgerRawTranscript(detail.session_id, {
        demo,
      })
      const blob = new Blob([JSON.stringify(transcript.events, null, 2)], {
        type: "application/json",
      })
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = href
      anchor.download = `${detail.session_id.replace(/[^a-zA-Z0-9._-]/g, "_")}-transcript.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
    } catch {
      setDownloadError("Could not download the transcript.")
    } finally {
      setIsDownloading(false)
    }
  }

  const messages = detail.message_count || detail.event_count

  return (
    <aside className={styles.rail}>
      <div className={cn(styles.grp, styles.grpFirst)}>Session</div>
      <Kv k="ID" mono value={detail.session_id} />
      <Kv k="User" value={userDisplayLabel(detail)} />
      <Kv k="Agent" mono value={agentLabel(detail)} />
      <Kv k="Harness" value={harnessWithVersion(detail)} />
      {detail.repo ? <Kv k="Repo" mono value={detail.repo} /> : null}
      {detail.branch ? <Kv k="Branch" mono value={detail.branch} /> : null}

      <div className={styles.grp}>Timing</div>
      <Kv
        k="Started"
        mono
        value={formatStamp(detail.started_at ?? detail.occurred_at_first)}
      />
      <Kv
        k="Ended"
        mono
        value={formatStamp(detail.ended_at ?? detail.occurred_at_last)}
      />
      <Kv k="Duration" value={formatDuration(detail.duration_ms)} />

      <div className={styles.grp}>Activity</div>
      <Kv k="Messages" value={String(messages)} />
      <Kv k="Commands" value={String(detail.command_count)} />
      <Kv k="Edits" value={String(detail.edit_count)} />
      <Kv k="Tokens" mono value={tokenSummary(detail)} />

      <div className={styles.grp}>Provenance</div>
      {detail.source ? <Kv k="Source" value={detail.source} /> : null}
      <Kv k="Imported" mono value={formatTimeOfDay(detail.imported_at)} />

      <div className={styles.grp}>Referenced by</div>
      {detail.documents.length > 0 ? (
        detail.documents.map((doc) => (
          <RailDoc doc={doc} key={doc.document_id} />
        ))
      ) : (
        <div className={styles.kv}>
          <span className={styles.kvK}>—</span>
        </div>
      )}

      <div className={styles.actRow}>
        {detail.raw_transcript_available ? (
          <button
            className={cn(styles.btn, styles.btnSolid)}
            disabled={isDownloading}
            onClick={() => void downloadRawTranscript()}
            type="button"
          >
            {isDownloading ? "Preparing download…" : "Download transcript"}
          </button>
        ) : null}
        <button className={styles.btn} onClick={copyMarkdown} type="button">
          Copy as Markdown
        </button>
      </div>
      {downloadError ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {downloadError}
        </p>
      ) : null}
    </aside>
  )
}

function Kv({ k, mono, value }: { k: string; mono?: boolean; value: string }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvK}>{k}</span>
      <span className={cn(styles.kvV, mono && styles.kvVMono)}>{value}</span>
    </div>
  )
}

function RailDoc({ doc }: { doc: LedgerDocRef }) {
  return (
    <Link
      className={styles.doc}
      params={{ documentId: doc.document_id }}
      to="/v2/library/$documentId"
    >
      <span className={styles.docDt}>
        <span className={styles.docLink}>{doc.title}</span>
        {doc.state === "stale" ? (
          <span className={cn(styles.flag, styles.flagStale)}>
            ⚠ may be stale
          </span>
        ) : doc.state === "new" ? (
          <span className={cn(styles.flag, styles.flagFresh)}>+ new doc</span>
        ) : null}
      </span>
    </Link>
  )
}
