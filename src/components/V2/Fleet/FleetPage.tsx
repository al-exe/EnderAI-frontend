import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import {
  createTaskforceFleetSession,
  deleteTaskforceFleetSession,
  readTaskforceFleet,
  type TaskforceFleetAgent,
  type TaskforceFleetSession,
  updateTaskforceFleetSession,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"
import {
  agentDisplayName,
  agentMeta,
  agentStatus,
  compactPresence,
  type FleetStatus,
  fleetRepo,
  fleetTitle,
  runningCount,
  STATE_LABEL,
  waitingCount,
} from "./fleetStatus"

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

const STATE_CLASS: Record<FleetStatus, string | undefined> = {
  run: undefined,
  waiting: styles.stateWaiting,
  paused: styles.statePaused,
  idle: styles.stateIdle,
}

function StatusDot({ status }: { status: FleetStatus }) {
  return (
    <span
      data-testid="fleet-status-dot"
      className={cn(
        styles.sdot,
        styles[status],
        status === "run" && styles.pulse,
      )}
    />
  )
}

function AgentRow({
  agent,
  onOpen,
}: {
  agent: TaskforceFleetAgent
  onOpen: (agent: TaskforceFleetAgent) => void
}) {
  const status = agentStatus(agent)
  const age = compactPresence(agent)
  const showAgeInState = status === "waiting" || status === "idle"
  const docTitle = agent.active_document_id ? agent.title : null

  return (
    <button
      type="button"
      data-testid="fleet-agent-row"
      className={styles.arow}
      onClick={() => onOpen(agent)}
    >
      <StatusDot status={status} />
      <div className={styles.who}>
        <div className={styles.nm}>{agentDisplayName(agent)}</div>
        <div className={styles.meta}>{agentMeta(agent)}</div>
        {status !== "run" && (
          <div className={cn(styles.state, STATE_CLASS[status])}>
            {STATE_LABEL[status]}
            {showAgeInState ? ` · ${age}` : ""}
          </div>
        )}
      </div>
      <div className={styles.work}>
        <div className={styles.workSummary}>
          {agent.summary_markdown || "Connected — no summary captured yet"}
        </div>
        {docTitle && (
          <div className={styles.detailLine}>
            <span className={styles.docInline}>{docTitle}</span>
          </div>
        )}
      </div>
      <div className={styles.age}>{status === "run" ? age : ""}</div>
    </button>
  )
}

function FleetCard({
  fleet,
  onOpenAgent,
  onRename,
  onDelete,
}: {
  fleet: TaskforceFleetSession
  onOpenAgent: (agent: TaskforceFleetAgent) => void
  onRename: (fleet: TaskforceFleetSession, name: string) => void
  onDelete: (fleet: TaskforceFleetSession) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(fleet.name)

  const repo = fleetRepo(fleet)
  const running = runningCount(fleet.agents)
  const total = fleet.agents.length

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName || nextName === fleet.name) {
      setName(fleet.name)
      setRenaming(false)
      return
    }
    onRename(fleet, nextName)
    setRenaming(false)
  }

  return (
    <section className={styles.fleet}>
      <div className={styles.fhead}>
        {renaming ? (
          <form onSubmit={submitRename} className="flex-1">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              aria-label="Fleet name"
              className="h-7"
            />
          </form>
        ) : (
          <span className={styles.fname}>{fleetTitle(fleet)}</span>
        )}

        {!renaming &&
          (repo ? (
            <span className={styles.frepo}>
              <b>{repo.repo}</b>
              {repo.branch ? ` · ${repo.branch}` : ""}
            </span>
          ) : (
            <span className={styles.frepo}>no repo bound</span>
          ))}

        {!renaming && (
          <span className={styles.fcount}>
            {running > 0 ? (
              <>
                <span className={styles.pin} />
                {running} active · {total}
              </>
            ) : (
              `${total} ${total === 1 ? "agent" : "agents"}`
            )}
          </span>
        )}

        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${fleetTitle(fleet)} actions`}
                className={styles.fmenu}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setName(fleet.name)
                  setRenaming(true)
                }}
              >
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(fleet)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div>
        {fleet.agents.length === 0 ? (
          <div className={styles.emptyRows}>
            No active agents in this fleet yet.
          </div>
        ) : (
          fleet.agents.map((agent) => (
            <AgentRow
              key={agent.session_id}
              agent={agent}
              onOpen={onOpenAgent}
            />
          ))
        )}
      </div>

      <Link
        to="/v2/settings"
        search={{ tab: "connect-agent" }}
        className={styles.newagent}
      >
        <Plus />
        <span>New agent in {fleetTitle(fleet)}</span>
      </Link>
    </section>
  )
}

export function FleetPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mutationError, setMutationError] = useState<unknown>(null)

  const fleetQuery = useQuery({
    queryKey: FLEET_QUERY_KEY,
    queryFn: readTaskforceFleet,
    refetchInterval: 30_000,
  })

  const refreshFleet = () =>
    queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEY })

  const createMutation = useMutation({
    mutationFn: () => createTaskforceFleetSession(),
    onSuccess: () => {
      setMutationError(null)
      refreshFleet()
    },
    onError: setMutationError,
  })
  const renameMutation = useMutation({
    mutationFn: ({
      fleet,
      name,
    }: {
      fleet: TaskforceFleetSession
      name: string
    }) => updateTaskforceFleetSession(fleet.id, name),
    onSuccess: refreshFleet,
    onError: setMutationError,
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTaskforceFleetSession,
    onSuccess: refreshFleet,
    onError: setMutationError,
  })

  const fleetSessions = fleetQuery.data?.fleet_sessions ?? []
  const allAgents = fleetSessions.flatMap((fleet) => fleet.agents)
  const running = runningCount(allAgents)
  const waiting = waitingCount(allAgents)

  const summaryBits = [`${running} running`]
  if (waiting) summaryBits.push(`${waiting} waiting for input`)

  const openAgent = (agent: TaskforceFleetAgent) =>
    navigate({
      to: "/v2/fleet/$sessionId",
      params: { sessionId: agent.session_id },
    })

  const renameFleet = (fleet: TaskforceFleetSession, name: string) => {
    setMutationError(null)
    renameMutation.mutate({ fleet, name })
  }
  const deleteFleet = (fleet: TaskforceFleetSession) => {
    if (
      window.confirm(`Delete "${fleetTitle(fleet)}"? Its agents will detach.`)
    ) {
      setMutationError(null)
      deleteMutation.mutate(fleet.id)
    }
  }

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        styles.page,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div className={cn(V2_PAGE_BODY, "gap-0 pb-6 md:pb-8")}>
        <div
          className={cn(
            V2_STICKY_HEADER_CLASS,
            "flex flex-col gap-1 border-b-0 pb-4",
          )}
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>
              <p className={styles.summaryLine}>
                <span className={styles.lead}>
                  {allAgents.length}{" "}
                  {allAgents.length === 1 ? "agent" : "agents"}
                </span>{" "}
                · {summaryBits.join(" · ")} · {fleetSessions.length}{" "}
                {fleetSessions.length === 1 ? "fleet" : "fleets"}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-fit shrink-0"
              disabled={createMutation.isPending}
              onClick={() => {
                setMutationError(null)
                createMutation.mutate()
              }}
            >
              <Plus />
              New fleet
            </Button>
          </header>
        </div>

        <div className="flex min-h-0 flex-col pt-6">
          {Boolean(mutationError) && (
            <div className="mb-4 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage(mutationError)}
            </div>
          )}

          {fleetQuery.isLoading ? (
            <div className={styles.fleetList}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse border border-border bg-muted/20"
                />
              ))}
            </div>
          ) : fleetQuery.error ? (
            <div className="border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-medium text-destructive">
                Fleet could not load
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage(fleetQuery.error)}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fleetQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : fleetSessions.length === 0 ? (
            <div className="flex flex-col items-start gap-4 border border-border bg-card p-6">
              <div>
                <h2 className="font-medium text-foreground">
                  Connect a terminal to start capturing work
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Taskforce creates documents automatically as your connected
                  coding agents work, so context carries across terminals and
                  VMs.
                </p>
              </div>
              <Button asChild>
                <Link to="/v2/settings" search={{ tab: "connect-agent" }}>
                  Connect agent
                </Link>
              </Button>
            </div>
          ) : (
            <div className={styles.fleetList}>
              {fleetSessions.map((fleet) => (
                <FleetCard
                  key={fleet.id}
                  fleet={fleet}
                  onOpenAgent={openAgent}
                  onRename={renameFleet}
                  onDelete={deleteFleet}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
