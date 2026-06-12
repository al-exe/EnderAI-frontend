import { Link } from "@tanstack/react-router"
import { RadioTower } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"

type FleetInstanceStatus = "running" | "needs-review" | "idle" | "queued"
type FleetDocumentMode = "reading" | "writing"

type FleetDocument = {
  title: string
  mode: FleetDocumentMode
}

type FleetInstance = {
  id: string
  model: string
  status: FleetInstanceStatus
  workingOn: React.ReactNode
  documents: FleetDocument[]
  elapsed: string
}

type FleetSession = {
  id: string
  title: string
  elapsed: string
  instances: FleetInstance[]
}

const STATUS_LABELS: Record<FleetInstanceStatus, string> = {
  running: "Running",
  "needs-review": "Needs review",
  idle: "Idle",
  queued: "Queued",
}

const FLEET_SESSIONS: FleetSession[] = [
  {
    id: "stripe-tax",
    title: "Stripe tax rollout — annual plans",
    elapsed: "22m",
    instances: [
      {
        id: "stripe-tax-opus",
        model: "claude-opus-4.1",
        status: "running",
        workingOn: (
          <>
            Wiring <code>automatic_tax</code> onto the subscription create path
          </>
        ),
        documents: [
          { title: "Stripe checkout wiring", mode: "writing" },
          { title: "Billing edge cases", mode: "reading" },
        ],
        elapsed: "12m",
      },
      {
        id: "stripe-tax-sonnet-tests",
        model: "claude-sonnet-4",
        status: "running",
        workingOn: (
          <>
            Running the <code>billing/dedupe</code> integration suite
          </>
        ),
        documents: [{ title: "Webhook idempotency notes", mode: "reading" }],
        elapsed: "6m",
      },
      {
        id: "stripe-tax-sonnet-review",
        model: "claude-sonnet-4",
        status: "needs-review",
        workingOn: "Drafted the tax-engine decision note",
        documents: [{ title: "Tax engine decision", mode: "writing" }],
        elapsed: "18m",
      },
    ],
  },
  {
    id: "clerk-migration",
    title: "Auth0 → Clerk migration window",
    elapsed: "1h 04m",
    instances: [
      {
        id: "clerk-migration-opus",
        model: "claude-opus-4.1",
        status: "running",
        workingOn: (
          <>
            Re-shaping <code>org_id</code> + <code>role</code> for Clerk session
            tokens
          </>
        ),
        documents: [{ title: "Auth0 → Clerk plan", mode: "reading" }],
        elapsed: "41m",
      },
      {
        id: "clerk-migration-sonnet",
        model: "claude-sonnet-4",
        status: "idle",
        workingOn: (
          <>
            Backfilling <code>tenant_id</code> RLS policies — needs staging
            creds
          </>
        ),
        documents: [{ title: "Postgres RLS audit", mode: "writing" }],
        elapsed: "23m",
      },
    ],
  },
  {
    id: "mcp-oauth",
    title: "Hosted MCP OAuth rotation fix",
    elapsed: "8m",
    instances: [
      {
        id: "mcp-oauth-opus",
        model: "claude-opus-4.1",
        status: "running",
        workingOn: (
          <>
            Clearing the cached credential on <code>invalid_grant</code>,
            forcing re-issue
          </>
        ),
        documents: [{ title: "Hosted MCP OAuth rotation", mode: "writing" }],
        elapsed: "8m",
      },
    ],
  },
  {
    id: "tailwind-tokens",
    title: "Tailwind v4 token sweep",
    elapsed: "queued",
    instances: [
      {
        id: "tailwind-tokens-sonnet",
        model: "claude-sonnet-4",
        status: "queued",
        workingOn: "Renaming theme tokens to the v4 map",
        documents: [{ title: "Tailwind v4 token map", mode: "reading" }],
        elapsed: "—",
      },
    ],
  },
]

function sessionSummary(instances: FleetInstance[]): string {
  const counts = instances.reduce<Record<FleetInstanceStatus, number>>(
    (result, instance) => {
      result[instance.status] += 1
      return result
    },
    { running: 0, "needs-review": 0, idle: 0, queued: 0 },
  )
  const details = (
    [
      ["running", counts.running],
      ["needs review", counts["needs-review"]],
      ["idle", counts.idle],
      ["queued", counts.queued],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`)

  return `${instances.length} ${instances.length === 1 ? "instance" : "instances"} · ${details.join(" · ")}`
}

function FleetInstanceRow({ instance }: { instance: FleetInstance }) {
  const isMuted = instance.status === "idle" || instance.status === "queued"

  return (
    <div className={styles.instance}>
      <div className={styles.identity}>
        <span
          className={cn(
            styles.statusDot,
            instance.status === "running" && styles.runningDot,
            instance.status === "queued" && styles.queuedDot,
          )}
          aria-hidden="true"
        />
        <div className={styles.modelBlock}>
          <div className={styles.model}>{instance.model}</div>
          <div
            className={cn(
              styles.status,
              (instance.status === "needs-review" ||
                instance.status === "idle") &&
                styles.attentionStatus,
            )}
          >
            {STATUS_LABELS[instance.status]}
          </div>
        </div>
      </div>

      <div className={cn(styles.workingOn, isMuted && styles.muted)}>
        {instance.workingOn}
      </div>

      <div className={styles.documents}>
        {instance.documents.length > 0 ? (
          instance.documents.map((document) => (
            <div
              className={styles.document}
              key={`${instance.id}-${document.title}`}
            >
              <span className={styles.documentTitle}>{document.title}</span>
              <span className={styles.documentMode}>{document.mode}</span>
            </div>
          ))
        ) : (
          <span className={styles.noDocuments}>No documents</span>
        )}
      </div>

      <div className={styles.elapsed}>{instance.elapsed}</div>
    </div>
  )
}

function FleetSessionCard({ session }: { session: FleetSession }) {
  return (
    <section className={styles.session} aria-labelledby={`${session.id}-title`}>
      <header className={styles.sessionHeader}>
        <h2 id={`${session.id}-title`} className={styles.sessionTitle}>
          {session.title}
        </h2>
        <span className={styles.sessionElapsed}>{session.elapsed}</span>
      </header>
      <p className={styles.sessionSummary}>
        {sessionSummary(session.instances)}
      </p>

      <div className={styles.instances}>
        <div className={styles.columns} aria-hidden="true">
          <div>Instance</div>
          <div>Working on</div>
          <div>Documents</div>
          <div className={styles.alignRight}>Time</div>
        </div>
        {session.instances.map((instance) => (
          <FleetInstanceRow key={instance.id} instance={instance} />
        ))}
      </div>
    </section>
  )
}

export function FleetPage() {
  const instanceCount = FLEET_SESSIONS.reduce(
    (total, session) => total + session.instances.length,
    0,
  )
  const runningCount = FLEET_SESSIONS.reduce(
    (total, session) =>
      total +
      session.instances.filter((instance) => instance.status === "running")
        .length,
    0,
  )

  return (
    <section className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>
              Fleet · {FLEET_SESSIONS.length} active sessions
            </p>
            <h1>Fleet</h1>
          </div>
          <Button asChild size="sm">
            <Link to="/v2/settings" search={{ tab: "connect-agent" }}>
              + New session
            </Link>
          </Button>
        </header>

        <div className={styles.overview}>
          <div className={styles.summary}>
            <strong>{FLEET_SESSIONS.length}</strong> sessions ·{" "}
            <strong>{instanceCount}</strong> instances ·{" "}
            <strong>{runningCount}</strong> running
          </div>
          <div className={styles.liveLabel}>
            <RadioTower aria-hidden="true" />
            Live activity
          </div>
        </div>

        <div className={styles.sessionList}>
          {FLEET_SESSIONS.map((session) => (
            <FleetSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </section>
  )
}
