import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { type DragEvent, type FormEvent, useRef, useState } from "react"
import {
  assignTaskforceFleetSession,
  createTaskforceFleetSession,
  deleteTaskforceFleetSession,
  readTaskforceFleet,
  renameTaskforceSession,
  type TaskforceFleetAgent,
  type TaskforceFleetResponse,
  type TaskforceFleetSession,
  updateTaskforceFleetSession,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  V2_TAB_CONTENT_CLASS,
  V2_TAB_EYEBROW_CLASS,
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
  onRename,
  onDragStart,
  onDragEnd,
  isDragging,
  isMoving,
  draggable = true,
}: {
  agent: TaskforceFleetAgent
  onOpen: (agent: TaskforceFleetAgent) => void
  onRename: (agent: TaskforceFleetAgent, displayName: string) => void
  onDragStart: (
    agent: TaskforceFleetAgent,
    event: DragEvent<HTMLButtonElement>,
  ) => void
  onDragEnd: () => void
  isDragging: boolean
  isMoving: boolean
  draggable?: boolean
}) {
  const suppressClick = useRef(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(agent.display_name ?? "")
  const status = agentStatus(agent)
  const age = compactPresence(agent)
  const showAgeInState = status === "waiting" || status === "idle"
  const docTitle = agent.active_document_id ? agent.title : null
  const sessionLabel = agentDisplayName(agent)

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    const nextName = renameValue.trim()
    if (!nextName || nextName === agent.display_name) {
      setRenameValue(agent.display_name ?? "")
      setRenameOpen(false)
      return
    }
    onRename(agent, nextName)
    setRenameOpen(false)
  }

  return (
    <div
      data-testid="fleet-agent-row"
      className={cn(
        styles.arow,
        isDragging && styles.arowDragging,
        isMoving && styles.arowMoving,
      )}
    >
      <button
        type="button"
        className={styles.arowMain}
        draggable={draggable && !isMoving}
        title={
          draggable
            ? "Drag to move this agent to another fleet"
            : "View this agent session"
        }
        onClick={() => {
          if (suppressClick.current) return
          onOpen(agent)
        }}
        onDragStart={(event) => {
          suppressClick.current = true
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("text/plain", agent.session_id)
          onDragStart(agent, event)
        }}
        onDragEnd={() => {
          onDragEnd()
          window.setTimeout(() => {
            suppressClick.current = false
          }, 0)
        }}
      >
        <span className={styles.dragCell} aria-hidden="true">
          <GripVertical className={styles.dragGrip} />
          <StatusDot status={status} />
        </span>
        <div className={styles.who}>
          <div className={styles.nm}>{sessionLabel}</div>
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
            {agent.summary_markdown || "No current work captured yet"}
          </div>
          {docTitle && (
            <div className={styles.detailLine}>
              <span className={styles.docInline}>{docTitle}</span>
            </div>
          )}
        </div>
      </button>

      <div className={styles.age}>{status === "run" ? age : ""}</div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${sessionLabel} actions`}
            className={styles.arowMenu}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setRenameValue(agent.display_name ?? "")
              setRenameOpen(true)
            }}
          >
            <Pencil />
            Rename
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open)
          if (!open) setRenameValue(agent.display_name ?? "")
        }}
      >
        <DialogContent>
          <form onSubmit={submitRename}>
            <DialogHeader>
              <DialogTitle>Rename session</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={120}
                autoFocus
                aria-label="Session name"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !renameValue.trim() ||
                  renameValue.trim() === agent.display_name
                }
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FleetCard({
  fleet,
  onOpenAgent,
  onRenameAgent,
  onRename,
  onDelete,
  draggingAgent,
  dropTargetId,
  movingSessionId,
  onAgentDragStart,
  onAgentDragEnd,
  onDragOver,
  onDropAgent,
}: {
  fleet: TaskforceFleetSession
  onOpenAgent: (agent: TaskforceFleetAgent) => void
  onRenameAgent: (agent: TaskforceFleetAgent, displayName: string) => void
  onRename: (fleet: TaskforceFleetSession, name: string) => void
  onDelete: (fleet: TaskforceFleetSession) => void
  draggingAgent: TaskforceFleetAgent | null
  dropTargetId: string | null
  movingSessionId: string | null
  onAgentDragStart: (
    agent: TaskforceFleetAgent,
    event: DragEvent<HTMLButtonElement>,
  ) => void
  onAgentDragEnd: () => void
  onDragOver: (fleetSessionId: string) => void
  onDropAgent: (
    agent: TaskforceFleetAgent,
    destination: TaskforceFleetSession,
  ) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(fleet.name ?? "")

  const repo = fleetRepo(fleet)
  const running = runningCount(fleet.agents)
  const total = fleet.agents.length
  const isHistory = fleet.is_history
  const isDropCandidate =
    !isHistory &&
    draggingAgent !== null &&
    draggingAgent.fleet_session_id !== fleet.id
  const isDropTarget = isDropCandidate && dropTargetId === fleet.id
  const hasPendingMove =
    movingSessionId !== null &&
    fleet.agents.some((agent) => agent.session_id === movingSessionId)

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName || nextName === fleet.name) {
      setName(fleet.name ?? "")
      setRenaming(false)
      return
    }
    onRename(fleet, nextName)
    setRenaming(false)
  }

  return (
    <section
      aria-label={`${fleetTitle(fleet)} fleet`}
      data-testid={`fleet-card-${fleet.id}`}
      className={cn(
        styles.fleet,
        isHistory && styles.history,
        isDropTarget && styles.fleetDropTarget,
        hasPendingMove && styles.fleetDropPending,
      )}
      onDragOver={(event) => {
        if (!isDropCandidate) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOver(fleet.id)
      }}
      onDrop={(event) => {
        if (!draggingAgent || !isDropCandidate) return
        event.preventDefault()
        onDropAgent(draggingAgent, fleet)
      }}
    >
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

        {!renaming && !isHistory && (
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
                  setName(fleet.name ?? "")
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
            {isHistory
              ? "Inactive agent sessions appear here."
              : "No active agents in this fleet yet."}
          </div>
        ) : (
          fleet.agents.map((agent) => (
            <AgentRow
              key={agent.session_id}
              agent={agent}
              onOpen={onOpenAgent}
              onRename={onRenameAgent}
              onDragStart={onAgentDragStart}
              onDragEnd={onAgentDragEnd}
              isDragging={draggingAgent?.session_id === agent.session_id}
              isMoving={movingSessionId === agent.session_id}
              draggable={!isHistory}
            />
          ))
        )}
      </div>
    </section>
  )
}

export function FleetPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mutationError, setMutationError] = useState<unknown>(null)
  const [draggingAgent, setDraggingAgent] =
    useState<TaskforceFleetAgent | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
  const renameAgentMutation = useMutation({
    mutationFn: ({
      agent,
      displayName,
    }: {
      agent: TaskforceFleetAgent
      displayName: string
    }) => renameTaskforceSession(agent.session_id, displayName),
    onSuccess: refreshFleet,
    onError: setMutationError,
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTaskforceFleetSession,
    onSuccess: refreshFleet,
    onError: setMutationError,
  })
  const moveMutation = useMutation({
    mutationFn: ({
      sessionId,
      destinationId,
    }: {
      sessionId: string
      destinationId: string
    }) => assignTaskforceFleetSession(sessionId, destinationId),
    onMutate: async ({ sessionId, destinationId }) => {
      setMutationError(null)
      await queryClient.cancelQueries({ queryKey: FLEET_QUERY_KEY })
      const previous =
        queryClient.getQueryData<TaskforceFleetResponse>(FLEET_QUERY_KEY)

      queryClient.setQueryData<TaskforceFleetResponse>(
        FLEET_QUERY_KEY,
        (current) => {
          if (!current) return current
          const movingAgent = current.fleet_sessions
            .flatMap((fleet) => fleet.agents)
            .find((agent) => agent.session_id === sessionId)
          if (!movingAgent) return current

          return {
            ...current,
            fleet_sessions: current.fleet_sessions.map((fleet) => ({
              ...fleet,
              agents:
                fleet.id === destinationId
                  ? [
                      ...fleet.agents.filter(
                        (agent) => agent.session_id !== sessionId,
                      ),
                      { ...movingAgent, fleet_session_id: destinationId },
                    ]
                  : fleet.agents.filter(
                      (agent) => agent.session_id !== sessionId,
                    ),
            })),
          }
        },
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FLEET_QUERY_KEY, context.previous)
      }
      setMutationError(error)
    },
    onSettled: refreshFleet,
  })

  const fleetSessions = fleetQuery.data?.fleet_sessions ?? []
  const workFleets = fleetSessions.filter((fleet) => !fleet.is_history)
  const allAgents = fleetSessions.flatMap((fleet) => fleet.agents)
  const activeAgents = workFleets.flatMap((fleet) => fleet.agents)
  const running = runningCount(activeAgents)
  const waiting = waitingCount(activeAgents)

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
  const renameAgent = (agent: TaskforceFleetAgent, displayName: string) => {
    setMutationError(null)
    renameAgentMutation.mutate({ agent, displayName })
  }
  const deleteFleet = (fleet: TaskforceFleetSession) => {
    if (
      window.confirm(`Delete "${fleetTitle(fleet)}"? Its agents will detach.`)
    ) {
      setMutationError(null)
      deleteMutation.mutate(fleet.id)
    }
  }
  const endAgentDrag = () => {
    setDraggingAgent(null)
    setDropTargetId(null)
  }
  const moveAgent = (
    agent: TaskforceFleetAgent,
    destination: TaskforceFleetSession,
  ) => {
    endAgentDrag()
    if (agent.fleet_session_id === destination.id || moveMutation.isPending) {
      return
    }
    moveMutation.mutate({
      sessionId: agent.session_id,
      destinationId: destination.id,
    })
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
              <div className={V2_TAB_EYEBROW_CLASS}>
                {activeAgents.length}{" "}
                {activeAgents.length === 1 ? "agent" : "agents"} ·{" "}
                {summaryBits.join(" · ")} · {workFleets.length}{" "}
                {workFleets.length === 1 ? "fleet" : "fleets"}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Fleet
              </h1>
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

        <div className={V2_TAB_CONTENT_CLASS}>
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
          ) : allAgents.length === 0 ? (
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
                  onRenameAgent={renameAgent}
                  onRename={renameFleet}
                  onDelete={deleteFleet}
                  draggingAgent={draggingAgent}
                  dropTargetId={dropTargetId}
                  movingSessionId={
                    moveMutation.isPending
                      ? moveMutation.variables.sessionId
                      : null
                  }
                  onAgentDragStart={(agent) => {
                    setMutationError(null)
                    setDraggingAgent(agent)
                    setDropTargetId(null)
                  }}
                  onAgentDragEnd={endAgentDrag}
                  onDragOver={setDropTargetId}
                  onDropAgent={moveAgent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
