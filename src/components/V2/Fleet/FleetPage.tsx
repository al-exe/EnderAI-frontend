import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { readV2Document } from "@/api/v2Documents"
import {
  assignTaskforceFleetSession,
  createTaskforceFleetSession,
  deleteTaskforceFleetSession,
  readTaskforceFleet,
  readTaskforceSessionLog,
  type TaskforceFleetAgent,
  type TaskforceFleetSession,
  updateTaskforceFleetSession,
} from "@/api/v2Taskforce"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"
import styles from "./FleetPage.module.css"

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

type DetailSelection =
  | { kind: "agent"; agent: TaskforceFleetAgent }
  | { kind: "fleet"; fleet: TaskforceFleetSession }
  | null

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function presenceLabel(agent: TaskforceFleetAgent) {
  if (agent.minutes_ago < 1) return "Active now"
  if (agent.minutes_ago === 1) return "Active 1 minute ago"
  return `Active ${agent.minutes_ago} minutes ago`
}

function repoLabel(agent: TaskforceFleetAgent) {
  const cwdParts = agent.cwd?.split("/").filter(Boolean) ?? []
  return agent.repo || cwdParts[cwdParts.length - 1] || "Unknown repo"
}

// Turn a raw harness model id into a human label, e.g.
// "claude-opus-4-8" -> "Opus 4.8", "claude-fable-5" -> "Fable 5".
function modelLabel(modelId: string | null): string | null {
  if (!modelId) return null
  const [family, ...rest] = modelId.replace(/^claude-/, "").split("-")
  if (!family) return null
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  const version = rest.join(".")
  return version ? `${name} ${version}` : name
}

// Heading shown for an agent. Once Taskforce has captured a document the
// document title wins; until then a brand-new session shows the model it's
// running (e.g. "Opus 4.8") rather than the bare working-directory name.
function agentDisplayName(agent: TaskforceFleetAgent) {
  return agent.title || modelLabel(agent.model_id) || repoLabel(agent)
}

function agentModelName(agent: TaskforceFleetAgent) {
  return modelLabel(agent.model_id) || "Connected agent"
}

function compactPresence(agent: TaskforceFleetAgent) {
  if (agent.minutes_ago < 1) return "now"
  return `${agent.minutes_ago}m`
}

function fleetSummary(agents: TaskforceFleetAgent[]) {
  const running = agents.filter((agent) => agent.minutes_ago < 5).length
  const idle = agents.length - running
  const details = [
    running > 0 ? `${running} running` : "",
    idle > 0 ? `${idle} idle` : "",
  ].filter(Boolean)

  return `${agents.length} ${agents.length === 1 ? "instance" : "instances"}${
    details.length ? ` · ${details.join(" · ")}` : ""
  }`
}

function AgentCard({
  agent,
  fleetSessions,
  isMoving,
  onMove,
  onCreateSession,
  onOpen,
}: {
  agent: TaskforceFleetAgent
  fleetSessions: TaskforceFleetSession[]
  isMoving: boolean
  onMove: (agent: TaskforceFleetAgent, fleetSessionId: string) => void
  onCreateSession: (agent: TaskforceFleetAgent) => void
  onOpen: (agent: TaskforceFleetAgent) => void
}) {
  const isLive = agent.minutes_ago < 5

  return (
    <article className={styles.instance}>
      <div className={styles.identity}>
        <button
          type="button"
          className={styles.instanceOpen}
          onClick={() => onOpen(agent)}
        >
          <span
            className={cn(styles.statusDot, isLive && styles.runningDot)}
            title={presenceLabel(agent)}
          />
          <div className={styles.modelBlock}>
            <h3 className={styles.model}>{agentModelName(agent)}</h3>
            <div className={cn(styles.status, !isLive && styles.idleStatus)}>
              {isLive ? "Running" : "Idle"}
            </div>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isMoving}
              aria-label={`Move ${agent.title || agent.session_id}`}
              className={styles.instanceMenu}
            >
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {fleetSessions.map((fleetSession) => (
              <DropdownMenuItem
                key={fleetSession.id}
                disabled={agent.fleet_session_id === fleetSession.id}
                onSelect={() => onMove(agent, fleetSession.id)}
              >
                <FolderKanban />
                {fleetSession.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => onCreateSession(agent)}>
              <Plus />
              New session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        className={cn(styles.workingOn, !isLive && styles.muted)}
        onClick={() => onOpen(agent)}
      >
        {agent.summary_markdown ||
          `Connected in ${repoLabel(agent)}${
            agent.branch ? ` on ${agent.branch}` : ""
          }`}
      </button>

      <div className={styles.documents}>
        {agent.active_document_id ? (
          <Link
            to="/v2/library/$documentId"
            params={{ documentId: agent.active_document_id }}
            className={styles.document}
          >
            <span className={styles.documentTitle}>
              {agent.title || "Active Taskforce document"}
            </span>
            <span className={styles.documentMode}>writing</span>
          </Link>
        ) : (
          <span className={styles.noDocuments}>No active document</span>
        )}
        {agent.referenced_document_ids.length > 0 && (
          <button
            type="button"
            className={styles.document}
            onClick={() => onOpen(agent)}
          >
            <span className={styles.documentTitle}>
              {agent.referenced_document_ids.length} referenced{" "}
              {agent.referenced_document_ids.length === 1
                ? "document"
                : "documents"}
            </span>
            <span className={styles.documentMode}>reading</span>
          </button>
        )}
      </div>

      <div className={styles.elapsed}>{compactPresence(agent)}</div>
    </article>
  )
}

function FleetBox({
  fleet,
  allFleetSessions,
  isMoving,
  onMove,
  onCreateSession,
  onOpenAgent,
  onOpenFleet,
  onRename,
  onDelete,
}: {
  fleet: TaskforceFleetSession
  allFleetSessions: TaskforceFleetSession[]
  isMoving: boolean
  onMove: (agent: TaskforceFleetAgent, fleetSessionId: string) => void
  onCreateSession: (agent: TaskforceFleetAgent) => void
  onOpenAgent: (agent: TaskforceFleetAgent) => void
  onOpenFleet: (fleet: TaskforceFleetSession) => void
  onRename: (fleet: TaskforceFleetSession, name: string) => void
  onDelete: (fleet: TaskforceFleetSession) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(fleet.name)

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
    <section className={styles.session}>
      <div className={styles.sessionHeader}>
        {renaming ? (
          <form onSubmit={submitRename} className={styles.renameForm}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              aria-label="Fleet session name"
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className={styles.sessionOpen}
            onClick={() => onOpenFleet(fleet)}
          >
            <h2 className={styles.sessionTitle}>{fleet.name}</h2>
          </button>
        )}

        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fleet session actions"
                className={styles.sessionMenu}
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
      <p className={styles.sessionSummary}>{fleetSummary(fleet.agents)}</p>

      <div className={styles.instances}>
        <div className={styles.columns} aria-hidden="true">
          <div>Instance</div>
          <div>Working on</div>
          <div>Documents</div>
          <div className={styles.alignRight}>Time</div>
        </div>
        {fleet.agents.length === 0 ? (
          <div className={styles.emptySession}>
            Move an active agent here to group its work.
          </div>
        ) : (
          fleet.agents.map((agent) => (
            <AgentCard
              key={agent.session_id}
              agent={agent}
              fleetSessions={allFleetSessions}
              isMoving={isMoving}
              onMove={onMove}
              onCreateSession={onCreateSession}
              onOpen={onOpenAgent}
            />
          ))
        )}
      </div>
    </section>
  )
}

function AgentDetail({ agent }: { agent: TaskforceFleetAgent }) {
  const logQuery = useQuery({
    queryKey: ["v2-taskforce-session-log", { sessionId: agent.session_id }],
    queryFn: () => readTaskforceSessionLog({ sessionId: agent.session_id }),
  })

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader className="border-b">
        <SheetTitle>{agentDisplayName(agent)}</SheetTitle>
        <SheetDescription>{presenceLabel(agent)}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <div className="flex flex-wrap gap-2">
          {agent.specialist_slug && (
            <Badge variant="outline">{agent.specialist_slug}</Badge>
          )}
          {agent.repo && <Badge variant="secondary">{agent.repo}</Badge>}
          {agent.branch && <Badge variant="secondary">{agent.branch}</Badge>}
        </div>

        <Button asChild className="w-full">
          <Link to="/v2/ledger" search={{ session_id: agent.session_id }}>
            <ScrollText />
            View session in Ledger
          </Link>
        </Button>

        <section>
          <h3 className="text-sm font-semibold">Current work</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {agent.summary_markdown || "No summary has been captured yet."}
          </p>
        </section>

        {agent.cwd && (
          <section>
            <h3 className="text-sm font-semibold">Working directory</h3>
            <code className="mt-2 block overflow-x-auto bg-muted p-3 text-xs">
              {agent.cwd}
            </code>
          </section>
        )}

        {agent.active_document_id && (
          <Button asChild variant="outline">
            <Link
              to="/v2/library/$documentId"
              params={{ documentId: agent.active_document_id }}
            >
              <BookOpen />
              Open active document
            </Link>
          </Button>
        )}

        <section>
          <h3 className="text-sm font-semibold">
            Contributed Taskforce documents
          </h3>
          {logQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Loading session log…
            </p>
          ) : logQuery.error ? (
            <p className="mt-2 text-sm text-destructive">
              {errorMessage(logQuery.error)}
            </p>
          ) : logQuery.data?.entries.length ? (
            <div className="mt-3 space-y-2">
              {logQuery.data.entries.map((entry) => (
                <Link
                  key={`${entry.query_id}-${entry.document_id}`}
                  to="/v2/library/$documentId"
                  params={{ documentId: entry.document_id }}
                  className="block border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{entry.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {entry.summary_markdown}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No consulted documents are recorded for this session yet.
            </p>
          )}
        </section>
      </div>
    </SheetContent>
  )
}

function FleetDetail({ fleet }: { fleet: TaskforceFleetSession }) {
  const documentIds = useMemo(
    () =>
      Array.from(
        new Set(
          fleet.agents.flatMap((agent) => [
            ...(agent.active_document_id ? [agent.active_document_id] : []),
            ...agent.referenced_document_ids,
          ]),
        ),
      ),
    [fleet.agents],
  )
  const documentQueries = useQueries({
    queries: documentIds.map((documentId) => ({
      queryKey: ["v2-document", { documentId }],
      queryFn: () => readV2Document(documentId),
    })),
  })

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader className="border-b">
        <SheetTitle>{fleet.name}</SheetTitle>
        <SheetDescription>
          {fleet.agents.length} active agent
          {fleet.agents.length === 1 ? "" : "s"}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <section>
          <h3 className="text-sm font-semibold">Members</h3>
          <div className="mt-3 space-y-2">
            {fleet.agents.length ? (
              fleet.agents.map((agent) => (
                <div
                  key={agent.session_id}
                  className="border border-border p-3"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bot className="size-4 text-muted-foreground" />
                    {agentDisplayName(agent)}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {repoLabel(agent)}
                    {agent.branch ? ` · ${agent.branch}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No active members.
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Contributed documents</h3>
          <div className="mt-3 space-y-2">
            {documentIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents have been captured for this session yet.
              </p>
            ) : (
              documentQueries.map((query, index) => {
                const documentId = documentIds[index]
                return (
                  <Link
                    key={documentId}
                    to="/v2/library/$documentId"
                    params={{ documentId }}
                    className="flex items-center gap-3 border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="min-w-0 truncate text-sm font-medium">
                      {query.data?.title ||
                        (query.isLoading ? "Loading…" : documentId)}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </section>
      </div>
    </SheetContent>
  )
}

export function FleetPage() {
  const queryClient = useQueryClient()
  const [detail, setDetail] = useState<DetailSelection>(null)
  const [mutationError, setMutationError] = useState<unknown>(null)

  const fleetQuery = useQuery({
    queryKey: FLEET_QUERY_KEY,
    queryFn: readTaskforceFleet,
    refetchInterval: 30_000,
  })

  const refreshFleet = () =>
    queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEY })

  const assignMutation = useMutation({
    mutationFn: ({
      sessionId,
      fleetSessionId,
    }: {
      sessionId: string
      fleetSessionId: string
    }) => assignTaskforceFleetSession(sessionId, fleetSessionId),
    onSuccess: refreshFleet,
    onError: setMutationError,
  })
  const createMutation = useMutation({
    mutationFn: ({ agentSessionId }: { agentSessionId?: string }) =>
      createTaskforceFleetSession().then(async (fleetSession) => {
        if (agentSessionId) {
          try {
            await assignTaskforceFleetSession(agentSessionId, fleetSession.id)
          } catch (error) {
            await deleteTaskforceFleetSession(fleetSession.id)
            throw error
          }
        }
        return fleetSession
      }),
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
    onSuccess: () => {
      setDetail(null)
      refreshFleet()
    },
    onError: setMutationError,
  })

  const fleetSessions = fleetQuery.data?.fleet_sessions ?? []
  const activeSessionCount = fleetSessions.length
  const activeAgentCount = fleetSessions.reduce(
    (total, fleet) => total + fleet.agents.length,
    0,
  )
  const runningAgentCount = fleetSessions.reduce(
    (total, fleet) =>
      total + fleet.agents.filter((agent) => agent.minutes_ago < 5).length,
    0,
  )

  const moveAgent = (agent: TaskforceFleetAgent, fleetSessionId: string) => {
    setMutationError(null)
    assignMutation.mutate({ sessionId: agent.session_id, fleetSessionId })
  }

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div className={cn(V2_PAGE_BODY, "gap-0 pb-6 md:pb-8")}>
        <div className={V2_STICKY_HEADER_CLASS}>
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={V2_TAB_EYEBROW_CLASS}>
                Fleet · {activeSessionCount} active session
                {activeSessionCount === 1 ? "" : "s"} · {activeAgentCount}{" "}
                active agent{activeAgentCount === 1 ? "" : "s"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Fleet
              </h1>
            </div>
            <Button
              className="w-fit"
              onClick={() => {
                setMutationError(null)
                createMutation.mutate({})
              }}
              disabled={createMutation.isPending}
            >
              <Plus />
              {createMutation.isPending ? "Creating…" : "New session"}
            </Button>
          </header>
        </div>

        <div className={styles.pageBody}>
          <div className={styles.overview}>
            <div className={styles.overviewSummary}>
              <strong>{activeSessionCount}</strong>{" "}
              {activeSessionCount === 1 ? "session" : "sessions"} ·{" "}
              <strong>{activeAgentCount}</strong>{" "}
              {activeAgentCount === 1 ? "instance" : "instances"} ·{" "}
              <strong>{runningAgentCount}</strong> running
            </div>
            <div className={styles.liveLabel}>Live activity</div>
          </div>

          {Boolean(mutationError) && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage(mutationError)}
            </div>
          )}

          {fleetQuery.isLoading ? (
            <div className={styles.sessionList}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse border bg-muted/30"
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
            <div className="flex flex-col items-start gap-4 border bg-card p-6">
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
            <div className={styles.sessionList}>
              {fleetSessions.map((fleet) => (
                <FleetBox
                  key={fleet.id}
                  fleet={fleet}
                  allFleetSessions={fleetSessions}
                  isMoving={assignMutation.isPending}
                  onMove={moveAgent}
                  onCreateSession={(selectedAgent) => {
                    setMutationError(null)
                    createMutation.mutate({
                      agentSessionId: selectedAgent.session_id,
                    })
                  }}
                  onOpenAgent={(agent) => setDetail({ kind: "agent", agent })}
                  onOpenFleet={(selectedFleet) =>
                    setDetail({ kind: "fleet", fleet: selectedFleet })
                  }
                  onRename={(selectedFleet, name) => {
                    setMutationError(null)
                    renameMutation.mutate({ fleet: selectedFleet, name })
                  }}
                  onDelete={(selectedFleet) => {
                    if (
                      window.confirm(
                        `Delete "${selectedFleet.name}"? Its agents will move to the default session.`,
                      )
                    ) {
                      setMutationError(null)
                      deleteMutation.mutate(selectedFleet.id)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        {detail?.kind === "agent" && <AgentDetail agent={detail.agent} />}
        {detail?.kind === "fleet" && <FleetDetail fleet={detail.fleet} />}
      </Sheet>
    </section>
  )
}
