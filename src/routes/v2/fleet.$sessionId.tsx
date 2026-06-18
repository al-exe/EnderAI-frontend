import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, ChevronLeft, ScrollText } from "lucide-react"
import { readV2Document } from "@/api/v2Documents"
import {
  readTaskforceFleet,
  readTaskforceSessionActivity,
  type TaskforceFleetAgent,
  type TaskforceFleetResponse,
  type TaskforceFleetSession,
  type TaskforceSessionActivityEntry,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
  V2_TAB_CONTENT_CLASS,
} from "@/components/V2/v2PageShell"
import {
  agentCapturePaused,
  agentDisplayName,
  agentFiles,
  agentPauseReason,
  agentQuestion,
  agentSpecialistName,
  agentSpecialistRuleCount,
  agentStartedAt,
  agentStatus,
  cleanActivityPromptText,
  compactPresence,
  type FleetStatus,
  fleetTitle,
  formatClockTime,
  formatLocalDateTime,
  hostLabel,
  liveActivityLabel,
  liveActivityTime,
  modelLabel,
  presenceLabel,
  STATE_LABEL,
  sessionPreviousWork,
  sessionWorkSummary,
} from "@/components/V2/Fleet/fleetStatus"
import { Markdown } from "@/components/V2/Fleet/Markdown"
import styles from "@/components/V2/Fleet/FleetPage.module.css"
import { useFleetPulseSync } from "@/components/V2/Fleet/fleetPulseSync"
import { SessionContextRailLink } from "@/components/V2/Fleet/SharedContextDrawer"
import { cn } from "@/lib/utils"

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

export const Route = createFileRoute("/v2/fleet/$sessionId")({
  component: FleetAgentDetailRoute,
  head: () => ({
    meta: [{ title: "Taskforce | Agent session" }],
  }),
})

type Located = {
  agent: TaskforceFleetAgent
  fleet: TaskforceFleetSession
  fleetName: string
}

function locateAgent(
  data: TaskforceFleetResponse | undefined,
  sessionId: string,
): Located | null {
  if (!data) return null
  for (const fleet of data.fleet_sessions) {
    const agent = fleet.agents.find(
      (candidate) => candidate.session_id === sessionId,
    )
    if (agent) return { agent, fleet, fleetName: fleetTitle(fleet) }
  }
  return null
}

const STATE_CLASS: Record<FleetStatus, string | undefined> = {
  run: undefined,
  waiting: styles.stateWaiting,
  paused: styles.statePaused,
  idle: styles.stateIdle,
  inactive: styles.stateInactive,
}

function metaRow(key: string, value: string, valueClass?: string) {
  return (
    <div className={styles.metarow} key={key}>
      <span className={styles.mk}>{key}</span>
      <span className={cn(styles.mv, valueClass)} title={value}>
        {value}
      </span>
    </div>
  )
}

// Prompt/reply/note carry free-form prose worth rendering as markdown. Command
// and edit titles are structured ("$ cmd", "Edited file") — leave them literal
// so shell/path characters aren't mangled by the markdown parser.
const PROSE_EVENT_KINDS = new Set(["prompt", "reply", "note"])

function eventTitle(event: TaskforceSessionActivityEntry): string {
  if (event.kind === "command") return `$ ${event.cmd ?? "command"}`
  if (event.kind === "edit") return `Edited ${event.file ?? "file"}`
  const raw = event.text ?? event.note ?? event.kind
  if (event.kind === "prompt" || event.kind === "reply") {
    return cleanActivityPromptText(raw) || raw
  }
  return raw
}

function eventDetail(event: TaskforceSessionActivityEntry): string | null {
  if (event.kind === "command") {
    const exit =
      event.exit_code === null ? "" : `exit ${event.exit_code.toString()}`
    return [event.output, exit].filter(Boolean).join(" · ") || null
  }
  if (event.kind === "edit") {
    const stats =
      event.added !== null || event.removed !== null
        ? `+${event.added ?? 0} −${event.removed ?? 0}`
        : ""
    return [event.note, stats].filter(Boolean).join(" · ") || null
  }
  return event.note
}

function FleetAgentDetailRoute() {
  const setPulseRoot = useFleetPulseSync()
  const { sessionId } = Route.useParams()
  const fleetQuery = useQuery({
    queryKey: FLEET_QUERY_KEY,
    queryFn: readTaskforceFleet,
    refetchInterval: 30_000,
  })
  const activityQuery = useQuery({
    queryKey: ["v2-taskforce-session-activity", { sessionId }],
    queryFn: () => readTaskforceSessionActivity({ sessionId }),
    refetchInterval: 30_000,
  })

  const located = locateAgent(fleetQuery.data, sessionId)

  const activeDocumentId = located?.agent.active_document_id ?? null
  const activeDocumentQuery = useQuery({
    queryKey: ["v2-document", { documentId: activeDocumentId }],
    queryFn: () => readV2Document(activeDocumentId!),
    enabled: Boolean(activeDocumentId),
  })

  if (fleetQuery.isLoading) {
    return (
      <section
        className={cn(
          V2_PAGE_FRAME,
          styles.page,
          "-mb-6 bg-background font-sans text-foreground md:-mb-8",
        )}
      >
        <div
          ref={setPulseRoot}
          className={cn(
            V2_PAGE_BODY,
            styles.detail,
            "items-center justify-center gap-0 pb-0",
          )}
        >
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </section>
    )
  }

  if (!located) {
    return (
      <section
        className={cn(
          V2_PAGE_FRAME,
          styles.page,
          "-mb-6 bg-background font-sans text-foreground md:-mb-8",
        )}
      >
        <div
          ref={setPulseRoot}
          className={cn(V2_PAGE_BODY, styles.detail, "items-start gap-4 pb-0")}
        >
          <p className="text-sm text-muted-foreground">
            {fleetQuery.error
              ? "This session could not be loaded."
              : "This agent is no longer active."}
          </p>
          <Button asChild variant="outline">
            <Link to="/v2/fleet">Back to Sessions</Link>
          </Button>
        </div>
      </section>
    )
  }

  const { agent, fleet, fleetName } = located
  const status = agentStatus(agent)
  const age = compactPresence(agent)
  const model = modelLabel(agent.model_id)
  const host = hostLabel(agent)
  const specialist = agentSpecialistName(agent) ?? agent.specialist_slug
  const ruleCount = agentSpecialistRuleCount(agent)
  const question = agentQuestion(agent)
  const capturePaused = agentCapturePaused(agent)
  const pauseReason = agentPauseReason(agent)
  const startedAt = agentStartedAt(agent)
  const files = agentFiles(agent)

  const activeDocumentTitle =
    activeDocumentQuery.data?.title ||
    agent.title ||
    "Active Taskforce document"

  const dmetaBits = [model, host].filter((bit): bit is string => Boolean(bit))

  // The same canonical event stream shown by Ledger, newest-first here.
  const activityEntries = [...(activityQuery.data?.entries ?? [])].sort(
    (a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""),
  )

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        styles.page,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div
        className={cn(V2_PAGE_BODY, styles.detail, "gap-0 pb-0")}
        data-testid="fleet-agent-detail"
        ref={setPulseRoot}
      >
        <div
          className={cn(styles.dtop, V2_STICKY_HEADER_CLASS, "border-b-0")}
        >
        <div className={styles.crumb}>
          <Link to="/v2/fleet" className={styles.back}>
            <ChevronLeft />
            Sessions
          </Link>
          <span className={styles.sep}>/</span>
          <span>{fleetName}</span>
        </div>

        <div className={styles.dhead}>
          <span
            data-testid="fleet-status-dot"
            className={cn(
              styles.sdot,
              styles[status],
              status === "run" && styles.pulse,
            )}
          />
          <div className={styles.dtitle}>
            <h1>{agentDisplayName(agent)}</h1>
            {dmetaBits.length > 0 && (
              <div className={styles.dmeta}>
                <b title={dmetaBits[0]}>{dmetaBits[0]}</b>
                {dmetaBits.slice(1).map((bit) => (
                  <span key={bit} title={bit}>
                    {" "}
                    · {bit}
                  </span>
                ))}
              </div>
            )}
            <div className={cn(styles.dstate, STATE_CLASS[status])}>
              {status === "run"
                ? `running · ${age}`
                : `${STATE_LABEL[status]} · ${age}`}
            </div>
          </div>
          <div className={styles.dactions}>
            <Button asChild variant="ghost" className={styles.ghost}>
              <Link
                to="/v2/ledger"
                search={{ session_id: agent.session_id }}
                title={presenceLabel(agent)}
              >
                <ScrollText />
                View in Ledger
              </Link>
            </Button>
            {agent.active_document_id && (
              <Button asChild variant="ghost" className={styles.ghost}>
                <Link
                  to="/v2/library/$documentId"
                  params={{ documentId: agent.active_document_id }}
                >
                  <BookOpen />
                  Open document
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

        <div
          className={cn(styles.dbody, V2_TAB_CONTENT_CLASS, "pt-0")}
          data-testid="fleet-detail-body"
        >
        <div className={styles.dmain}>
          {/* Currently working on — waiting agents surface a question when present. */}
          {status === "waiting" ? (
            question ? (
              <div className={styles.section}>
                <div className={styles.seclabel}>Waiting for input</div>
                <div className={styles.question}>
                  <div className={styles.questionText}>{question}</div>
                  <div className={styles.reply}>
                    <input
                      placeholder={`Reply to ${agentDisplayName(agent)}…`}
                      aria-label="Reply to agent"
                      disabled
                    />
                    <button type="button" disabled>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className={styles.section}>
              <div className={styles.seclabel}>Currently working on</div>
              <div className={styles.nowtask}>
                <Markdown>{sessionWorkSummary(agent)}</Markdown>
              </div>
            </div>
          )}

          {/* Previously worked on — the turn just before the in-progress one. */}
          {sessionPreviousWork(agent) ? (
            <div className={styles.section}>
              <div className={styles.seclabel}>Previously worked on</div>
              <div className={styles.nowtask}>
                <Markdown>{sessionPreviousWork(agent)}</Markdown>
              </div>
            </div>
          ) : null}

          {/* Activity — durable per-turn timeline, newest-first (TF-247). */}
          <div className={styles.section}>
            <div className={styles.seclabel}>Activity</div>
            <div className={styles.timeline}>
              <div className={cn(styles.tev, styles.tevNow)}>
                <span className={styles.tdot} />
                <div className={styles.tt}>{liveActivityTime(agent)}</div>
                <div className={styles.tx}>
                  <Markdown>
                    {liveActivityLabel(agent, {
                      capturePaused,
                      pauseReason,
                    })}
                  </Markdown>
                </div>
              </div>
              {activityEntries.map((entry) => {
                const detail = eventDetail(entry)
                const body = (
                  <>
                    <span className={styles.tdot} />
                    <div className={styles.tt}>
                      {formatClockTime(entry.occurred_at)}
                      <span className={styles.tkind}>{entry.kind}</span>
                    </div>
                    <div className={styles.tx}>
                      {PROSE_EVENT_KINDS.has(entry.kind) ? (
                        <Markdown>{eventTitle(entry)}</Markdown>
                      ) : (
                        eventTitle(entry)
                      )}
                    </div>
                    {detail && <div className={styles.tsub}>{detail}</div>}
                  </>
                )
                return entry.ledger_href ? (
                  <Link
                    key={entry.id}
                    to="/v2/ledger"
                    search={{ session_id: sessionId, event_id: entry.id }}
                    className={cn(styles.tev, styles.tevLink)}
                    title="Open this event in Ledger"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={styles.tev} key={entry.id}>
                    {body}
                  </div>
                )
              })}
              {activityQuery.isLoading && (
                <div className={styles.tev}>
                  <span className={styles.tdot} />
                  <div className={styles.tx}>Loading session activity…</div>
                </div>
              )}
              {!activityQuery.isLoading && activityEntries.length === 0 && (
                <div className={styles.tev}>
                  <span className={styles.tdot} />
                  <div className={styles.tx}>No activity captured yet.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.drail} data-testid="fleet-detail-rail">
          {/* Pause note — surfaces above everything when capture is paused. */}
          {capturePaused && pauseReason && (
            <div className={styles.block}>
              <div className={styles.pauserail}>
                <div className={styles.prH}>Capture paused</div>
                <div className={styles.prB}>{pauseReason}</div>
                <span className={styles.prAct}>Resume capture</span>
              </div>
            </div>
          )}

          {/* Profile in use — degrades to specialist slug until TF-245. */}
          {specialist && (
            <div className={styles.block}>
              <div className={styles.seclabel}>Profile in use</div>
              <div className={styles.profcard}>
                <div className={styles.pfTop}>
                  <span className={styles.pfAv}>
                    {specialist.slice(0, 2).toUpperCase()}
                  </span>
                  <div className={styles.pfId}>
                    <div className={styles.pfNm}>{specialist}</div>
                    <div className={styles.pfSub}>specialist</div>
                  </div>
                </div>
                {ruleCount != null && ruleCount > 0 && (
                  <div className={styles.pfMeta}>
                    {ruleCount} conventions applied
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session meta */}
          <div className={styles.block}>
            <div className={styles.seclabel}>Session</div>
            <p className={styles.sessionName}>{fleetName}</p>
            {model && metaRow("Model", model)}
            {startedAt && metaRow("Started", formatLocalDateTime(startedAt))}
            {metaRow("Session", agent.session_id)}
          </div>

          {agent.active_document_id && (
            <div className={styles.block}>
              <div className={styles.seclabel}>Document</div>
              <Link
                to="/v2/library/$documentId"
                params={{ documentId: agent.active_document_id }}
                className={styles.doccard}
                data-testid="fleet-detail-document"
              >
                <div className={styles.dmode}>writing</div>
                <div className={styles.dttl}>
                  {activeDocumentQuery.isLoading && !activeDocumentQuery.data
                    ? "Loading…"
                    : activeDocumentTitle}
                </div>
                <div className={styles.dupd}>Captured by this session</div>
              </Link>
            </div>
          )}

          <div className={styles.block}>
            <SessionContextRailLink fleet={fleet} />
          </div>

          {/* Files touched — degrades to empty until TF-245 supplies the list. */}
          <div className={styles.block}>
            <div className={styles.seclabel}>Files</div>
            {files.length > 0 ? (
              files.map((file) => (
                <div className={styles.fileitem} key={file.name}>
                  <span className={styles.fn}>{file.name}</span>
                  <span
                    className={cn(
                      styles.fs,
                      file.state === "new" && styles.fsNew,
                    )}
                  >
                    {file.state}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No files touched yet</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
