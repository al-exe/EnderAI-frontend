import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { BookOpen, ChevronLeft, ScrollText } from "lucide-react"
import {
  readTaskforceFleet,
  readTaskforceSessionLog,
  type TaskforceFleetAgent,
  type TaskforceFleetResponse,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import styles from "@/components/V2/Fleet/FleetPage.module.css"
import {
  agentDisplayName,
  agentQuestion,
  agentSpecialistName,
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
      <span className={cn(styles.mv, valueClass)}>{value}</span>
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
  const logQuery = useQuery({
    queryKey: ["v2-taskforce-session-log", { sessionId }],
    queryFn: () => readTaskforceSessionLog({ sessionId }),
  })

  const located = locateAgent(fleetQuery.data, sessionId)

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
  const referencedCount = agent.referenced_document_ids.length
  const question = agentQuestion(agent)

  const dmetaBits = [model, host, agent.branch].filter(Boolean)

  // Activity timeline — newest-first. The live "now" step sits on top, with
  // each captured document descending below it (from the session log).
  const captures = [...(logQuery.data?.entries ?? [])]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((entry) => ({
      key: `${entry.query_id}-${entry.document_id}`,
      time: formatClockTime(entry.occurred_at),
      text: `Captured update to ${entry.title}`,
    }))

  return (
    <div className={styles.detail}>
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
                <b>{dmetaBits[0]}</b>
                {dmetaBits.slice(1).map((bit) => (
                  <span key={bit}> · {bit}</span>
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

      <div className={styles.dbody}>
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

          {/* Activity — newest-first, derived from the session log. */}
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
              {captures.map((event) => (
                <div className={styles.tev} key={event.key}>
                  <span className={styles.tdot} />
                  <div className={styles.tt}>{event.time}</div>
                  <div className={styles.tx}>{event.text}</div>
                </div>
              ))}
              {logQuery.isLoading && (
                <div className={styles.tev}>
                  <span className={styles.tdot} />
                  <div className={styles.tx}>Loading session activity…</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.drail}>
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
            {metaRow("Session", agent.session_id)}
          </div>

          {/* Context in use — title resolution is TF-243. */}
          {referencedCount > 0 && (
            <div className={styles.block}>
              <div className={styles.seclabel}>Context in use</div>
              <div className={styles.ctxitem}>
                {referencedCount} referenced{" "}
                {referencedCount === 1 ? "document" : "documents"}
              </div>
            </div>
          )}

          {/* Files — backend exposes no files-touched list yet (TF-245). */}
          <div className={styles.block}>
            <div className={styles.seclabel}>Files</div>
            <div className={styles.empty}>No files touched yet</div>
          </div>
        </div>
      </div>
    </div>
  )
}
