import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  Archive,
  Bot,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react"
import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import {
  assignTaskforceFleetSession,
  createTaskforceFleetSession,
  deleteTaskforceFleetSession,
  readTaskforceFleet,
  renameTaskforceSession,
  setDefaultTaskforceFleetSession,
  type TaskforceFleetAgent,
  type TaskforceFleetResponse,
  type TaskforceFleetSession,
  updateTaskforceFleetSession,
} from "@/api/v2Taskforce"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
  V2_TAB_CONTENT_CLASS,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { persistedKey, usePersistentState } from "@/hooks/usePersistentState"
import { peekTaskforceSession } from "@/lib/taskforceSession"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"
import { useFleetPulseSync } from "./fleetPulseSync"
import {
  AGENT_KIND_LABEL,
  type AgentKind,
  agentActivityLine,
  agentDisplayName,
  agentKind,
  agentModelName,
  agentSpecialistName,
  agentSpecialistRuleCount,
  agentStatus,
  compactPresence,
  type FleetStatus,
  fleetTitle,
  formatClockTime,
  rosterStatusLabel,
  runningCount,
  waitingCount,
} from "./fleetStatus"
import { SharedContextDrawer } from "./SharedContextDrawer"

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

type FleetCollapsedMap = Record<string, boolean>

function deserializeFleetCollapsed(
  raw: unknown,
): FleetCollapsedMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
  const result: FleetCollapsedMap = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key === "string" && typeof value === "boolean") {
      result[key] = value
    }
  }
  return result
}

function defaultFleetCollapsed(fleet: TaskforceFleetSession) {
  return fleet.is_history
}

function fleetIsCollapsed(
  fleet: TaskforceFleetSession,
  collapsedByFleetId: FleetCollapsedMap,
) {
  if (fleet.id in collapsedByFleetId) {
    return collapsedByFleetId[fleet.id]
  }
  return defaultFleetCollapsed(fleet)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

const STATE_CLASS: Record<FleetStatus, string> = {
  run: styles.stateRunning,
  waiting: styles.stateWaiting,
  paused: styles.statePaused,
  idle: styles.stateIdle,
  inactive: styles.stateInactive,
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

const CHIP_CLASS: Record<AgentKind, string> = {
  claude: styles.chipClaude,
  codex: styles.chipCodex,
  cursor: styles.chipCursor,
  other: styles.chipOther,
}

function ClientChip({ kind }: { kind: AgentKind }) {
  const label = AGENT_KIND_LABEL[kind]
  return (
    <span
      data-testid="fleet-agent-chip"
      className={cn(styles.chip, CHIP_CLASS[kind])}
      title={`Driven by ${label}`}
    >
      {label}
    </span>
  )
}

// Compact detail card shown while hovering an agent row. Rendered into a body
// portal and positioned next to the cursor (see AgentRow.placeCard), so the row
// itself can stay terse — the full activity line and meta live here instead of
// scrolling inside the row.
function AgentHoverCard({
  agent,
  fleetName,
  cardRef,
}: {
  agent: TaskforceFleetAgent
  fleetName: string
  cardRef: React.RefObject<HTMLDivElement | null>
}) {
  const status = agentStatus(agent)
  const title = agentDisplayName(agent)
  const model = agentModelName(agent)
  const branch = agent.branch?.trim() || null
  const activity = agentActivityLine(agent)
  const started = agent.started_at ? formatClockTime(agent.started_at) : null
  const presence = compactPresence(agent)

  return createPortal(
    <div ref={cardRef} className={styles.hovercard} role="tooltip">
      <div className={styles.hcInner}>
        <div className={styles.hcCard}>
          <div className={styles.hcTop}>
            <ClientChip kind={agentKind(agent)} />
            <span className={styles.hcName}>{fleetName}</span>
            <StatusDot status={status} />
          </div>
          <div className={styles.hcTitle}>{title}</div>
          {activity && (
            <div className={styles.hcAct}>
              <span className={styles.hcCaret} aria-hidden="true">
                ▸
              </span>
              <span>{activity}</span>
            </div>
          )}
          <div className={styles.hcRows}>
            <span className={styles.hcKey}>status</span>
            <span className={styles.hcVal}>{rosterStatusLabel(agent)}</span>
            <span className={styles.hcKey}>model</span>
            <span className={styles.hcVal}>{model}</span>
            {branch && (
              <>
                <span className={styles.hcKey}>branch</span>
                <span className={styles.hcVal}>{branch}</span>
              </>
            )}
            {started && (
              <>
                <span className={styles.hcKey}>started</span>
                <span className={styles.hcVal}>{started}</span>
              </>
            )}
            <span className={styles.hcKey}>active</span>
            <span className={styles.hcVal}>{presence}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function AgentRow({
  agent,
  fleetName,
  onOpen,
  onRename,
  onArchive,
  onDragStart,
  onDragEnd,
  isDragging,
  isMoving,
  canArchive,
  draggable = true,
}: {
  agent: TaskforceFleetAgent
  fleetName: string
  onOpen: (agent: TaskforceFleetAgent) => void
  onRename: (agent: TaskforceFleetAgent, displayName: string) => void
  onArchive: (agent: TaskforceFleetAgent) => void
  onDragStart: (
    agent: TaskforceFleetAgent,
    event: DragEvent<HTMLElement>,
  ) => void
  onDragEnd: () => void
  isDragging: boolean
  isMoving: boolean
  canArchive: boolean
  draggable?: boolean
}) {
  const suppressClick = useRef(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(agent.display_name ?? "")
  const status = agentStatus(agent)
  const age = compactPresence(agent)
  const sessionLabel = agentDisplayName(agent)
  const model = agentModelName(agent)
  const branch = agent.branch?.trim() || null
  const activity = agentActivityLine(agent)
  const [rowHovered, setRowHovered] = useState(false)
  // The specialist profile steering this session, if Taskforce routed one.
  // Prefer the resolved name; fall back to a humanized slug.
  const specialistSlug = agent.specialist_slug?.trim() || null
  const profileLabel =
    agentSpecialistName(agent) ??
    (specialistSlug
      ? specialistSlug
          .split(/[-_]/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : null)
  const profileRuleCount = agentSpecialistRuleCount(agent)

  // Cursor-following hover card. We track the latest pointer position in a ref
  // and reposition the portal element imperatively, so following the cursor
  // never triggers a React re-render.
  const hoverCardRef = useRef<HTMLDivElement>(null)
  const lastPointer = useRef({ x: 0, y: 0 })

  const placeCard = useCallback(() => {
    const el = hoverCardRef.current
    if (!el) return
    const { x, y } = lastPointer.current
    const margin = 10
    const offset = 18
    const width = el.offsetWidth
    const height = el.offsetHeight
    let nextX = x + offset
    let nextY = y + offset
    if (nextX + width > window.innerWidth - margin) nextX = x - width - offset
    if (nextX < margin) nextX = margin
    if (nextY + height > window.innerHeight - margin)
      nextY = y - height - offset
    if (nextY < margin) nextY = margin
    el.style.transform = `translate(${nextX}px, ${nextY}px)`
  }, [])

  // Position before paint when the card mounts so it never flashes at (0,0).
  useLayoutEffect(() => {
    if (rowHovered) placeCard()
  }, [rowHovered, placeCard])

  // A fixed card detaches from the row on scroll, so dismiss it instead.
  useEffect(() => {
    if (!rowHovered) return
    const dismiss = () => setRowHovered(false)
    window.addEventListener("scroll", dismiss, { capture: true, passive: true })
    return () =>
      window.removeEventListener("scroll", dismiss, { capture: true })
  }, [rowHovered])

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
    <fieldset
      aria-label={`${sessionLabel} session row`}
      data-testid="fleet-agent-row"
      className={cn(
        styles.arow,
        isDragging && styles.arowDragging,
        isMoving && styles.arowMoving,
      )}
      draggable={draggable && !isMoving}
      title={draggable ? undefined : "View this agent session"}
      onMouseEnter={(event) => {
        lastPointer.current = { x: event.clientX, y: event.clientY }
        setRowHovered(true)
      }}
      onMouseMove={(event) => {
        lastPointer.current = { x: event.clientX, y: event.clientY }
        if (rowHovered) placeCard()
      }}
      onMouseLeave={() => setRowHovered(false)}
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
      <button
        type="button"
        className={styles.arowMain}
        onClick={() => {
          if (suppressClick.current) return
          onOpen(agent)
        }}
      >
        <span className={styles.dragCell} aria-hidden="true">
          <GripVertical className={styles.dragGrip} />
          <StatusDot status={status} />
        </span>
        <div className={styles.who}>
          <ClientChip kind={agentKind(agent)} />
          <div className={styles.identity}>
            <div className={styles.nm} data-testid="fleet-agent-name">
              {sessionLabel}
            </div>
            <div className={styles.asub} data-testid="fleet-agent-sub">
              {profileLabel && (
                <>
                  <span
                    className={styles.profilePill}
                    data-testid="fleet-agent-profile"
                    title={
                      profileRuleCount
                        ? `Profile: ${profileLabel} · ${profileRuleCount} routing rules`
                        : `Profile: ${profileLabel}`
                    }
                  >
                    <Bot
                      className={styles.profilePillIcon}
                      aria-hidden="true"
                    />
                    {profileLabel}
                  </span>
                  <span className={styles.asep} aria-hidden="true">
                    ·
                  </span>
                </>
              )}
              <span className={styles.amodel}>{model}</span>
              {branch && (
                <>
                  <span className={styles.asep} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.abranch}>{branch}</span>
                </>
              )}
              {activity && (
                <>
                  <span className={styles.asep} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.aactivity} title={activity}>
                    {activity}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div
          className={cn(styles.status, STATE_CLASS[status])}
          data-testid="fleet-agent-status"
        >
          {rosterStatusLabel(agent)}
        </div>
      </button>

      <div className={styles.age}>{age}</div>

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
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onArchive(agent)}>
                <Archive />
                Archive agent
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open)
          if (!open) setRenameValue(agent.display_name ?? "")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
            <DialogDescription>
              Give this agent session a short, recognizable name.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitRename}>
            <div className="space-y-2">
              <Label htmlFor="fleet-session-name">Session name</Label>
              <Input
                id="fleet-session-name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={120}
                autoFocus
                placeholder="Session name"
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

      {rowHovered && !isDragging && !isMoving && (
        <AgentHoverCard
          agent={agent}
          fleetName={fleetName}
          cardRef={hoverCardRef}
        />
      )}
    </fieldset>
  )
}

function FleetCard({
  fleet,
  isCollapsed,
  onToggleCollapse,
  onOpenAgent,
  onRenameAgent,
  onArchiveAgent,
  canArchiveAgents,
  onRename,
  onDelete,
  onSetDefault,
  draggingAgent,
  dropTargetId,
  movingSessionId,
  onAgentDragStart,
  onAgentDragEnd,
  onDragOver,
  onDropAgent,
}: {
  fleet: TaskforceFleetSession
  isCollapsed: boolean
  onToggleCollapse: () => void
  onOpenAgent: (agent: TaskforceFleetAgent) => void
  onRenameAgent: (agent: TaskforceFleetAgent, displayName: string) => void
  onArchiveAgent: (agent: TaskforceFleetAgent) => void
  canArchiveAgents: boolean
  onRename: (fleet: TaskforceFleetSession, name: string) => void
  onDelete: (fleet: TaskforceFleetSession) => void
  onSetDefault: (fleet: TaskforceFleetSession) => void
  draggingAgent: TaskforceFleetAgent | null
  dropTargetId: string | null
  movingSessionId: string | null
  onAgentDragStart: (
    agent: TaskforceFleetAgent,
    event: DragEvent<HTMLElement>,
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

  const running = runningCount(fleet.agents)
  const total = fleet.agents.length
  const isHistory = fleet.is_history
  // The Archive group IS a valid drop target — archiving is the user dragging a
  // session into it. (Agents never reach Archive automatically.)
  const isDropCandidate =
    draggingAgent !== null && draggingAgent.fleet_session_id !== fleet.id
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
      aria-label={`${fleetTitle(fleet)} session group`}
      data-testid={`fleet-card-${fleet.id}`}
      data-collapsed={isCollapsed ? "true" : "false"}
      className={cn(
        styles.fleet,
        isHistory && styles.history,
        isCollapsed && styles.fleetCollapsed,
        isDropCandidate && styles.fleetDropCandidate,
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
          <form onSubmit={submitRename} className={styles.fheadRename}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              aria-label="Session group name"
              className="h-7"
            />
          </form>
        ) : (
          <button
            type="button"
            className={cn(styles.fheadToggle, styles.fnameButton)}
            aria-expanded={!isCollapsed}
            aria-controls={`fleet-body-${fleet.id}`}
            data-testid={`fleet-header-toggle-${fleet.id}`}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className={styles.fchev} aria-hidden="true" />
            ) : (
              <ChevronDown className={styles.fchev} aria-hidden="true" />
            )}
            <span className={styles.fheadIdentity}>
              <span className={styles.fname}>{fleetTitle(fleet)}</span>
              {fleet.is_default && !isHistory && (
                <span className={styles.fdefault}>(default)</span>
              )}
            </span>
          </button>
        )}

        {!renaming && !isHistory && <SharedContextDrawer fleet={fleet} />}

        {!renaming && (
          <div className={styles.fheadMeta}>
            <span className={styles.fcount}>
              {`${running} active · ${total} total`}
            </span>
            {!isHistory && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${fleetTitle(fleet)} actions`}
                    className={styles.fmenu}
                    onClick={(event) => event.stopPropagation()}
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
                  {!fleet.is_default && (
                    <DropdownMenuItem onSelect={() => onSetDefault(fleet)}>
                      <Star />
                      Make default
                    </DropdownMenuItem>
                  )}
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
        )}
      </div>

      {!isCollapsed && (
        <div id={`fleet-body-${fleet.id}`}>
          {fleet.agents.length === 0 ? (
            <div className={styles.emptyRows}>
              {isHistory
                ? "Drag a session here to archive it."
                : "No active agents in this session group yet."}
            </div>
          ) : (
            fleet.agents.map((agent) => (
              <AgentRow
                key={agent.session_id}
                agent={agent}
                fleetName={fleetTitle(fleet)}
                onOpen={onOpenAgent}
                onRename={onRenameAgent}
                onArchive={onArchiveAgent}
                onDragStart={onAgentDragStart}
                onDragEnd={onAgentDragEnd}
                isDragging={draggingAgent?.session_id === agent.session_id}
                isMoving={movingSessionId === agent.session_id}
                canArchive={!isHistory && canArchiveAgents}
                draggable
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}

export function FleetPage() {
  const setPulseRoot = useFleetPulseSync()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const currentUser = peekTaskforceSession()
  const [collapsedByFleetId, setCollapsedByFleetId] =
    usePersistentState<FleetCollapsedMap>(
      persistedKey("fleet.session-collapsed", currentUser?.id ?? "anonymous"),
      {},
      { deserialize: deserializeFleetCollapsed },
    )
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
  const setDefaultMutation = useMutation({
    mutationFn: (fleet: TaskforceFleetSession) =>
      setDefaultTaskforceFleetSession(fleet.id),
    onSuccess: () => {
      setMutationError(null)
      refreshFleet()
    },
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
  const historyFleet = fleetSessions.find((fleet) => fleet.is_history)
  const allAgents = fleetSessions.flatMap((fleet) => fleet.agents)
  const activeAgents = workFleets.flatMap((fleet) => fleet.agents)
  const running = runningCount(activeAgents)
  const waiting = waitingCount(activeAgents)

  const eyebrowParts = [
    `${workFleets.length} ${workFleets.length === 1 ? "session" : "sessions"}`,
    `${activeAgents.length} ${activeAgents.length === 1 ? "agent" : "agents"}`,
    `${running} running`,
  ]
  if (waiting) eyebrowParts.push(`${waiting} awaiting prompt`)

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
  const setDefaultFleet = (fleet: TaskforceFleetSession) => {
    setMutationError(null)
    setDefaultMutation.mutate(fleet)
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
  const archiveAgent = (agent: TaskforceFleetAgent) => {
    if (!historyFleet) return
    moveAgent(agent, historyFleet)
  }
  const toggleFleetCollapsed = useCallback(
    (fleet: TaskforceFleetSession) => {
      setCollapsedByFleetId((current) => ({
        ...current,
        [fleet.id]: !fleetIsCollapsed(fleet, current),
      }))
    },
    [setCollapsedByFleetId],
  )

  return (
    <section
      ref={setPulseRoot}
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
            "flex flex-col gap-1 border-b-0 pb-2",
          )}
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className={V2_TAB_EYEBROW_CLASS}>
                {eyebrowParts.join(" · ")}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Sessions
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
              New session
            </Button>
          </header>
        </div>

        <div className={cn(V2_TAB_CONTENT_CLASS, "pt-2")}>
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
                Sessions could not load
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
                  isCollapsed={fleetIsCollapsed(fleet, collapsedByFleetId)}
                  onToggleCollapse={() => toggleFleetCollapsed(fleet)}
                  onOpenAgent={openAgent}
                  onRenameAgent={renameAgent}
                  onArchiveAgent={archiveAgent}
                  canArchiveAgents={Boolean(historyFleet)}
                  onRename={renameFleet}
                  onDelete={deleteFleet}
                  onSetDefault={setDefaultFleet}
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
