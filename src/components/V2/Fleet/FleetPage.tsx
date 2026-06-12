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
  Trash2,
} from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

const FLEET_QUERY_KEY = ["v2-taskforce-fleet"] as const

type DetailSelection =
  | { kind: "agent"; agent: TaskforceFleetAgent }
  | { kind: "fleet"; fleet: TaskforceFleetSession }
  | null

type CreateSessionRequest = {
  agentSessionId?: string
}

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
  onMove: (agent: TaskforceFleetAgent, fleetSessionId: string | null) => void
  onCreateSession: (agent: TaskforceFleetAgent) => void
  onOpen: (agent: TaskforceFleetAgent) => void
}) {
  const isLive = agent.minutes_ago < 5

  return (
    <article className="border border-border bg-background p-3 shadow-xs">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpen(agent)}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isLive
                  ? "animate-pulse bg-emerald-500"
                  : "bg-muted-foreground/50",
              )}
              title={presenceLabel(agent)}
            />
            <h3 className="truncate text-sm font-semibold">
              {agent.title || repoLabel(agent)}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span>{repoLabel(agent)}</span>
            {agent.branch && (
              <>
                <span aria-hidden>·</span>
                <span className="max-w-[190px] truncate">{agent.branch}</span>
              </>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {agent.summary_markdown ||
              "This session has just started capturing work."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {agent.specialist_slug && (
              <Badge variant="outline" className="font-mono text-[9px]">
                {agent.specialist_slug}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {presenceLabel(agent)}
            </span>
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
              New Fleet session
            </DropdownMenuItem>
            {agent.fleet_session_id && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onMove(agent, null)}>
                  Unassign
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
  onMove: (agent: TaskforceFleetAgent, fleetSessionId: string | null) => void
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
    <section className="flex min-h-[220px] flex-col border border-border bg-card">
      <div className="flex min-h-14 items-center gap-2 border-b border-border px-4 py-3">
        {renaming ? (
          <form onSubmit={submitRename} className="flex min-w-0 flex-1 gap-2">
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
            className="min-w-0 flex-1 text-left"
            onClick={() => onOpenFleet(fleet)}
          >
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-muted-foreground" />
              <h2 className="truncate text-sm font-semibold">{fleet.name}</h2>
              <Badge variant="secondary" className="text-[10px]">
                {fleet.agents.length}
              </Badge>
            </div>
          </button>
        )}

        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fleet session actions"
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

      <div className="flex flex-1 flex-col gap-2 p-3">
        {fleet.agents.length === 0 ? (
          <div className="grid min-h-28 flex-1 place-items-center border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
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
        <SheetTitle>{agent.title || repoLabel(agent)}</SheetTitle>
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
                    {agent.title || repoLabel(agent)}
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
                No documents have been captured for this Fleet session yet.
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

function CreateFleetDialog({
  request,
  isCreating,
  error,
  onClose,
  onSubmit,
}: {
  request: CreateSessionRequest | null
  isCreating: boolean
  error: unknown
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState("")

  useEffect(() => {
    if (request === null) setName("")
  }, [request])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextName = name.trim()
    if (nextName) onSubmit(nextName)
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) {
          setName("")
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Fleet session</DialogTitle>
            <DialogDescription>
              Create a named group for active coding agents.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Checkout redesign sprint"
            maxLength={120}
            autoFocus
            className="mt-5"
          />
          {Boolean(error) && (
            <p className="mt-2 text-sm text-destructive">
              {errorMessage(error)}
            </p>
          )}
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FleetPage() {
  const queryClient = useQueryClient()
  const [detail, setDetail] = useState<DetailSelection>(null)
  const [createRequest, setCreateRequest] =
    useState<CreateSessionRequest | null>(null)
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
      fleetSessionId: string | null
    }) => assignTaskforceFleetSession(sessionId, fleetSessionId),
    onSuccess: refreshFleet,
    onError: setMutationError,
  })
  const createMutation = useMutation({
    mutationFn: ({
      name,
      agentSessionId,
    }: {
      name: string
      agentSessionId?: string
    }) =>
      createTaskforceFleetSession(name).then(async (fleetSession) => {
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
      setCreateRequest(null)
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
  const unassigned = fleetQuery.data?.unassigned ?? []
  const totalAgents =
    unassigned.length +
    fleetSessions.reduce((total, fleet) => total + fleet.agents.length, 0)

  const moveAgent = (
    agent: TaskforceFleetAgent,
    fleetSessionId: string | null,
  ) => {
    setMutationError(null)
    assignMutation.mutate({ sessionId: agent.session_id, fleetSessionId })
  }

  return (
    <div className={V2_PAGE_FRAME}>
      <div className={V2_PAGE_BODY}>
        <header className={V2_STICKY_HEADER_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={V2_TAB_EYEBROW_CLASS}>Active agent control panel</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Fleet
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Group active Claude Code sessions and inspect the Taskforce
                documents each one contributed.
              </p>
            </div>
            <Button
              onClick={() => {
                setMutationError(null)
                setCreateRequest({})
              }}
            >
              <Plus />
              New Fleet session
            </Button>
          </div>
        </header>

        {Boolean(mutationError) && (
          <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage(mutationError)}
          </div>
        )}

        {fleetQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse border bg-muted/30"
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
        ) : totalAgents === 0 ? (
          <div className="flex flex-col items-start gap-4 border bg-card p-6">
            <div>
              <h2 className="font-medium text-foreground">
                Connect a terminal to start capturing work
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                Taskforce creates documents automatically as your connected
                coding agents work, so context carries across terminals and VMs.
              </p>
            </div>
            <Button asChild>
              <Link to="/v2/settings" search={{ tab: "connect-agent" }}>
                Connect agent
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="flex min-h-[220px] flex-col border border-dashed border-border bg-muted/20">
              <div className="flex min-h-14 items-center gap-2 border-b border-border px-4 py-3">
                <Bot className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Unassigned</h2>
                <Badge variant="secondary" className="text-[10px]">
                  {unassigned.length}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {unassigned.length ? (
                  unassigned.map((agent) => (
                    <AgentCard
                      key={agent.session_id}
                      agent={agent}
                      fleetSessions={fleetSessions}
                      isMoving={assignMutation.isPending}
                      onMove={moveAgent}
                      onCreateSession={(selectedAgent) => {
                        setMutationError(null)
                        setCreateRequest({
                          agentSessionId: selectedAgent.session_id,
                        })
                      }}
                      onOpen={(selectedAgent) =>
                        setDetail({ kind: "agent", agent: selectedAgent })
                      }
                    />
                  ))
                ) : (
                  <div className="grid min-h-28 flex-1 place-items-center px-4 text-center text-xs text-muted-foreground">
                    All active agents are assigned.
                  </div>
                )}
              </div>
            </section>

            {fleetSessions.map((fleet) => (
              <FleetBox
                key={fleet.id}
                fleet={fleet}
                allFleetSessions={fleetSessions}
                isMoving={assignMutation.isPending}
                onMove={moveAgent}
                onCreateSession={(selectedAgent) => {
                  setMutationError(null)
                  setCreateRequest({ agentSessionId: selectedAgent.session_id })
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
                      `Delete "${selectedFleet.name}"? Its agents will move to Unassigned.`,
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

      <CreateFleetDialog
        request={createRequest}
        isCreating={createMutation.isPending}
        error={createMutation.error}
        onClose={() => {
          setCreateRequest(null)
          setMutationError(null)
        }}
        onSubmit={(name) =>
          createMutation.mutate({
            name,
            agentSessionId: createRequest?.agentSessionId,
          })
        }
      />

      <Sheet
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        {detail?.kind === "agent" && <AgentDetail agent={detail.agent} />}
        {detail?.kind === "fleet" && <FleetDetail fleet={detail.fleet} />}
      </Sheet>
    </div>
  )
}
