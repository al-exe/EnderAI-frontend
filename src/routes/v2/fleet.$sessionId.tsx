import { useQueries, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, ChevronLeft, ScrollText } from "lucide-react"
import { readV2Document } from "@/api/v2Documents"
import {
  readTaskforceFleet,
  readTaskforceSessionActivity,
  type TaskforceFleetAgent,
  type TaskforceFleetResponse,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import styles from "@/components/V2/Fleet/FleetPage.module.css"
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
  compactPresence,
  type FleetStatus,
  fleetTitle,
  formatClockTime,
  hostLabel,
  modelLabel,
  presenceLabel,
  STATE_LABEL,
} from "@/components/V2/Fleet/fleetStatus"
import { cn } from "@/lib/utils"

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

export const Route = createFileRoute("/v2/fleet/$sessionId")({
  component: FleetAgentDetailRoute,
  head: () => ({
    meta: [{ title: "Taskforce | Agent session" }],
  }),
})

type Located = { agent: TaskforceFleetAgent; fleetName: string }

function locateAgent(
  data: TaskforceFleetResponse | undefined,
  sessionId: string,
): Located | null {
  if (!data) return null
  for (const fleet of data.fleet_sessions) {
    const agent = fleet.agents.find(
      (candidate) => candidate.session_id === sessionId,
    )
    if (agent) return { agent, fleetName: fleetTitle(fleet) }
  }
  return null
}

const STATE_CLASS: Record<FleetStatus, string | undefined> = {
  run: undefined,
  waiting: styles.stateWaiting,
  paused: styles.statePaused,
  idle: styles.stateIdle,
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

function FleetAgentDetailRoute() {
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

  // Resolve referenced-document titles for the "Context in use" rail block.
  const referencedIds = located?.agent.referenced_document_ids ?? []
  const contextQueries = useQueries({
    queries: referencedIds.map((documentId) => ({
      queryKey: ["v2-document", { documentId }],
      queryFn: () => readV2Document(documentId),
    })),
  })

  if (fleetQuery.isLoading) {
    return (
      <div className={cn(styles.detail, "items-center justify-center")}>
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    )
  }

  if (!located) {
    return (
      <div className={cn(styles.detail, "items-start gap-4")}>
        <p className="text-sm text-muted-foreground">
          {fleetQuery.error
            ? "This session could not be loaded."
            : "This agent is no longer active."}
        </p>
        <Button asChild variant="outline">
          <Link to="/v2/fleet">Back to Fleet</Link>
        </Button>
      </div>
    )
  }

  const { agent, fleetName } = located
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

  const contextItems = referencedIds.map((id, index) => {
    const query = contextQueries[index]
    return {
      id,
      label: query?.data?.title || (query?.isLoading ? "Loading…" : id),
    }
  })

  const dmetaBits = [model, host, agent.branch].filter((bit): bit is string =>
    Boolean(bit),
  )

  // Activity timeline — newest-first. The live "now" step sits on top; below it
  // each captured turn (user prompt + a summary of the agent's response),
  // deep-linking to the Ledger line that backs it (TF-247).
  const activityEntries = [...(activityQuery.data?.entries ?? [])].sort(
    (a, b) => b.occurred_at.localeCompare(a.occurred_at),
  )

  return (
    <div className={styles.detail} data-testid="fleet-agent-detail">
      <div className={styles.dtop}>
        <div className={styles.crumb}>
          <Link to="/v2/fleet" className={styles.back}>
            <ChevronLeft />
            Fleet
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

      <div className={styles.dbody} data-testid="fleet-detail-body">
        <div className={styles.dmain}>
          {/* Working on — a waiting agent surfaces its question + reply box. */}
          {status === "waiting" && question ? (
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
          ) : (
            <div className={styles.section}>
              <div className={styles.seclabel}>Working on</div>
              <div className={styles.nowtask}>
                {agent.summary_markdown ||
                  "No summary has been captured for this session yet."}
              </div>
            </div>
          )}

          {/* Document */}
          {agent.active_document_id && (
            <div className={styles.section}>
              <div className={styles.seclabel}>Document</div>
              <Link
                to="/v2/library/$documentId"
                params={{ documentId: agent.active_document_id }}
                className={styles.doccard}
              >
                <div className={styles.dmode}>writing</div>
                <div className={styles.dttl}>
                  {agent.title || "Active Taskforce document"}
                </div>
                <div className={styles.dupd}>Captured by this session</div>
              </Link>
            </div>
          )}

          {/* Activity — durable per-turn timeline, newest-first (TF-247). */}
          <div className={styles.section}>
            <div className={styles.seclabel}>Activity</div>
            <div className={styles.timeline}>
              <div className={cn(styles.tev, styles.tevNow)}>
                <span className={styles.tdot} />
                <div className={styles.tt}>now</div>
                <div className={styles.tx}>
                  {agent.summary_markdown || "Active in this session"}
                </div>
              </div>
              {activityEntries.map((entry) => {
                const body = (
                  <>
                    <span className={styles.tdot} />
                    <div className={styles.tt}>
                      {formatClockTime(entry.occurred_at)}
                    </div>
                    <div className={styles.tx}>{entry.prompt}</div>
                    {entry.response_summary && (
                      <div className={styles.tsub}>
                        {entry.response_summary}
                      </div>
                    )}
                  </>
                )
                // The Ledger is org-only; ledger_href is null otherwise, so the
                // row renders plain. When present we navigate to the session and
                // anchor at this turn's timestamp (transcript lines have no id).
                return entry.ledger_href ? (
                  <Link
                    key={entry.id}
                    to="/v2/ledger"
                    search={{ session_id: sessionId, at: entry.occurred_at }}
                    className={cn(styles.tev, styles.tevLink)}
                    title="Open the backing Ledger line"
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
            {metaRow("Fleet", fleetName)}
            {agent.branch && metaRow("Branch", agent.branch)}
            {(host || agent.repo) &&
              metaRow("Host", host ?? (agent.repo as string))}
            {model && metaRow("Model", model)}
            {startedAt && metaRow("Started", formatClockTime(startedAt))}
            {metaRow(
              "Capture",
              capturePaused ? "paused" : "on",
              capturePaused ? styles.capPaused : undefined,
            )}
            {metaRow("Session", agent.session_id)}
          </div>

          {/* Context in use — resolved referenced-document titles. */}
          {contextItems.length > 0 && (
            <div className={styles.block}>
              <div className={styles.seclabel}>Context in use</div>
              {contextItems.map((item) => (
                <div className={styles.ctxitem} key={item.id}>
                  {item.label}
                </div>
              ))}
            </div>
          )}

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
  )
}
