import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  readExecutionDetail,
  readThreadExecutions,
  readThreads,
  updateThreadTitle,
  type ExecutionArtifactRelation,
  type ExecutionArtifactLinkPublic,
  type ExecutionDetailPublic,
  type ExecutionPublic,
  type EventPublic,
  type ThreadPublic,
} from "@/api/tasks"
import type { ArtifactPublic } from "@/api/library"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
}

function humanizeWorkflowKey(workflowKey: string): string {
  return workflowKey
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === "github") return "GitHub"
      if (lower === "api") return "API"
      if (lower === "db") return "DB"
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function formatTimestamp(ts: string | null): string | null {
  if (!ts) return null
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return null

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const mm = String(date.getMonth() + 1)
  const dd = String(date.getDate())
  const yyyy = String(date.getFullYear())

  return `${time}, ${mm}/${dd}/${yyyy}`
}

function formatTimestampNoSeconds(ts: string | null): string | null {
  return formatTimestamp(ts)
}

function formatBadgeLabel(value: string): string {
  return value.trim().replace(/_/g, " ").toLowerCase()
}

function taskStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const lower = status.toLowerCase()
  if (lower === "done" || lower === "closed") return "success"
  if (lower === "in_progress") return "default"
  if (lower === "blocked" || lower === "error") return "destructive"
  return "outline"
}

function runStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const lower = status.toLowerCase()
  if (lower === "success") return "default"
  if (lower === "in_progress") return "secondary"
  if (lower === "failed" || lower === "error") return "destructive"
  return "outline"
}

function eventTypeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  const lower = type.toLowerCase()
  if (lower === "error") return "destructive"
  if (lower === "breakthrough") return "default"
  if (lower === "cmd" || lower === "sql") return "secondary"
  return "outline"
}

function relationVariant(
  relation: ExecutionArtifactRelation,
): "default" | "secondary" | "destructive" | "outline" {
  switch (relation) {
    case "used":
      return "outline"
    case "created":
      return "secondary"
    case "promoted":
      return "default"
    case "superseded":
      return "destructive"
  }
}

function normalizeBodyMdc(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
}

function JsonDetails({ data }: { data: Record<string, unknown> }) {
  const keys = Object.keys(data || {})
  if (keys.length === 0) return null

  const formatted = JSON.stringify(data, null, 2)

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted-foreground">
        data
      </summary>
      <pre className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-xs leading-relaxed">
        {formatted}
      </pre>
    </details>
  )
}

function ArtifactDialog({
  open,
  onOpenChange,
  item,
  bucketName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ArtifactPublic | null
  bucketName: string | null
}) {
  const body = useMemo(() => normalizeBodyMdc(item?.body_mdc ?? ""), [item?.body_mdc])
  const createdAt = formatTimestamp(item?.created_at ?? null)
  const lastUsedAt = formatTimestamp(item?.last_used_at ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {item?.kind ? (
              <Badge variant="outline">{item.kind}</Badge>
            ) : (
              <Badge variant="outline">artifact</Badge>
            )}
            {item?.promotion_mode === "user" && (
              <Badge variant="secondary">user</Badge>
            )}
            {bucketName ? (
              <div className="text-xs text-muted-foreground">{bucketName}</div>
            ) : null}
          </div>
          <DialogTitle>{item?.title ?? "Artifact"}</DialogTitle>
          <div className="text-xs text-muted-foreground">
            {createdAt ? `Created ${createdAt}` : null}
            {createdAt && lastUsedAt ? " • " : null}
            {lastUsedAt ? `Last used ${lastUsedAt}` : null}
          </div>
        </DialogHeader>

        <div className="rounded-md border bg-muted/20 p-4 max-h-[65vh] overflow-auto">
          <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {body}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ExecutionDetailDialog({
  executionId,
  open,
  onOpenChange,
}: {
  executionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError } = useQuery<ExecutionDetailPublic>({
    queryKey: ["executionDetail", executionId],
    queryFn: () => readExecutionDetail(executionId || ""),
    enabled: open && Boolean(executionId),
  })

  const [artifactOpen, setArtifactOpen] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactPublic | null>(
    null,
  )

  const grouped = useMemo(() => {
    const groups: Record<ExecutionArtifactRelation, ExecutionArtifactLinkPublic[]> = {
      used: [],
      created: [],
      promoted: [],
      superseded: [],
    }

    for (const link of data?.artifact_links ?? []) {
      groups[link.relation].push(link)
    }

    return groups
  }, [data?.artifact_links])

  const execution = data?.execution
  const startedAt = formatTimestampNoSeconds(execution?.started_at ?? null)
  const endedAt = formatTimestampNoSeconds(execution?.ended_at ?? null)

  const bucketName = selectedArtifact
    ? humanizeWorkflowKey(selectedArtifact.workflow_key)
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {execution?.status ? (
                <Badge variant={runStatusVariant(execution.status)}>
                  {formatBadgeLabel(execution.status)}
                </Badge>
              ) : null}
            </div>
            <DialogTitle>{execution?.summary ?? "Execution detail"}</DialogTitle>
            <div className="text-xs text-muted-foreground">
              {startedAt ? `Started ${startedAt}` : null}
              {startedAt && endedAt ? " • " : null}
              {endedAt ? `Ended ${endedAt}` : null}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError ? (
            <div className="rounded-md border bg-muted/20 p-4">
              <div className="font-medium">Couldn’t load Run detail</div>
              <div className="text-sm text-muted-foreground">
                Check backend connectivity and auth.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">Artifacts</h3>
                </div>

                <div className="space-y-4">
                  {(Object.keys(grouped) as ExecutionArtifactRelation[]).map((relation) => {
                    const links = grouped[relation]
                    if (!links.length) return null

                    return (
                      <div key={relation} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={relationVariant(relation)}>
                            {formatBadgeLabel(relation)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {links.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {links.map((link) => (
                            <Button
                              key={`${relation}:${link.artifact.id}`}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="justify-start max-w-full"
                              onClick={() => {
                                setSelectedArtifact(link.artifact)
                                setArtifactOpen(true)
                              }}
                            >
                              <span className="truncate">{link.artifact.title}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {(data?.artifact_links?.length ?? 0) === 0 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No artifacts linked to this execution yet.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Events
                  </h3>
                  <div className="text-xs text-muted-foreground">
                  </div>
                </div>

                <div className="space-y-3">
                  {(data?.events ?? []).map((event) => (
                    <RunEventRow key={event.id} event={event} />
                  ))}

                  {(data?.events?.length ?? 0) === 0 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No events recorded yet.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ArtifactDialog
        open={artifactOpen}
        onOpenChange={(next) => {
          setArtifactOpen(next)
          if (!next) setSelectedArtifact(null)
        }}
        item={selectedArtifact}
        bucketName={bucketName}
      />
    </>
  )
}

function RunEventRow({ event }: { event: EventPublic }) {
  const ts = formatTimestamp(event.ts)
  return (
    <div className="rounded-md border p-3 bg-muted/10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={eventTypeVariant(event.type)}>
            {formatBadgeLabel(event.type)}
          </Badge>
          {ts ? (
            <span className="text-xs text-muted-foreground">{ts}</span>
          ) : null}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          #{event.id}
        </span>
      </div>

      {event.message ? (
        <div className="mt-2 text-sm leading-relaxed">{event.message}</div>
      ) : null}

      <JsonDetails data={event.data || {}} />
    </div>
  )
}

function ThreadDialog({
  thread,
}: {
  thread: ThreadPublic
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [threadTitle, setThreadTitle] = useState(thread.title)
  const [isRenamingTitle, setIsRenamingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(thread.title)
  const [titleError, setTitleError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    setThreadTitle(thread.title)
    if (!isRenamingTitle) setTitleDraft(thread.title)
  }, [thread.title, isRenamingTitle])

  useEffect(() => {
    if (!isRenamingTitle) return
    const handle = window.setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [isRenamingTitle])

  const renameMutation = useMutation({
    mutationFn: (nextTitle: string) =>
      updateThreadTitle(thread.id, { title: nextTitle }),
    onSuccess: (updated) => {
      setThreadTitle(updated.title)
      setTitleDraft(updated.title)
      setIsRenamingTitle(false)
      setTitleError(null)
      queryClient.invalidateQueries({ queryKey: ["threads"] })
    },
    onError: () => {
      setTitleError("Couldn’t rename thread. Check backend connectivity/auth.")
    },
  })

  const cancelRename = () => {
    skipBlurCommitRef.current = false
    setIsRenamingTitle(false)
    setTitleDraft(threadTitle)
    setTitleError(null)
  }

  const commitRename = () => {
    const next = titleDraft.trim()
    if (!next) {
      setTitleError("Title can’t be empty.")
      return
    }

    if (next === threadTitle.trim()) {
      cancelRename()
      return
    }

    renameMutation.mutate(next)
  }
  const { data, isLoading, isError } = useQuery({
    queryKey: ["threadExecutions", thread.id],
    queryFn: () => readThreadExecutions(thread.id),
    enabled: open,
  })

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  )
  const [executionOpen, setExecutionOpen] = useState(false)

  const createdAt = formatTimestamp(thread.created_at)
  const lastTouchedAt = formatTimestamp(thread.last_touched_at)
  const bucketName = humanizeWorkflowKey(thread.workflow_key)

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) cancelRename()
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Open thread: ${threadTitle}`}
            className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={taskStatusVariant(thread.status)}>
                    {formatBadgeLabel(thread.status)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">{bucketName}</div>
                </div>
                <div className="font-semibold leading-tight">{threadTitle}</div>
              </CardHeader>
              <CardContent className="space-y-2">
                {thread.goal ? (
                  <p className="text-sm text-muted-foreground">{thread.goal}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {createdAt ? `Created ${createdAt}` : null}
                  {createdAt && lastTouchedAt ? " • " : null}
                  {lastTouchedAt ? `Updated ${lastTouchedAt}` : null}
                </div>
              </CardContent>
            </Card>
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={taskStatusVariant(thread.status)}>
                {formatBadgeLabel(thread.status)}
              </Badge>
              <div className="text-xs text-muted-foreground">{bucketName}</div>
            </div>
            <DialogTitle>
              {isRenamingTitle ? (
                <div className="space-y-2">
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    disabled={renameMutation.isPending}
                    onChange={(e) => {
                      setTitleDraft(e.target.value)
                      setTitleError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        commitRename()
                      }
                      if (e.key === "Escape") {
                        e.preventDefault()
                        skipBlurCommitRef.current = true
                        cancelRename()
                      }
                    }}
                    onBlur={() => {
                      if (skipBlurCommitRef.current) {
                        skipBlurCommitRef.current = false
                        return
                      }
                      commitRename()
                    }}
                  />
                  {titleError ? (
                    <div className="text-xs text-destructive">{titleError}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Enter to save • Esc to cancel
                    </div>
                  )}
                </div>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  className="cursor-text"
                  title="Double-click to rename"
                  onDoubleClick={() => {
                    setTitleDraft(threadTitle)
                    setIsRenamingTitle(true)
                    setTitleError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    setTitleDraft(threadTitle)
                    setIsRenamingTitle(true)
                    setTitleError(null)
                  }}
                >
                  {threadTitle}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-2">
                <div className="text-sm font-semibold tracking-tight">
                  Description
                </div>
              <div className="rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
                {thread.goal ?? (
                  <span className="italic text-muted-foreground">
                    No description recorded.
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="text-sm font-semibold tracking-tight">
                Acceptance criteria
              </div>
              <div className="rounded-md border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {thread.acceptance_criteria ?? (
                  <span className="italic text-muted-foreground">
                    No acceptance criteria recorded.
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold tracking-tight">
                  Executions
                </div>
                <div className="text-xs text-muted-foreground">
                  {data?.count ?? 0} total
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : isError ? (
                <div className="rounded-md border bg-muted/20 p-4">
                  <div className="font-medium">Couldn’t load Executions</div>
                  <div className="text-sm text-muted-foreground">
                    Check backend connectivity and auth.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.data ?? []).map((execution: ExecutionPublic) => (
                    <button
                      key={execution.id}
                      type="button"
                      className="w-full rounded-md border p-3 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSelectedExecutionId(execution.id)
                        setExecutionOpen(true)
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-medium leading-tight">
                            {execution.summary ?? "Execution"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(execution.started_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={runStatusVariant(execution.status)}>
                            {formatBadgeLabel(execution.status)}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}

                  {(data?.data?.length ?? 0) === 0 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No executions recorded yet.
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <ExecutionDetailDialog
        executionId={selectedExecutionId}
        open={executionOpen}
        onOpenChange={(next) => {
          setExecutionOpen(next)
          if (!next) setSelectedExecutionId(null)
        }}
      />
    </>
  )
}

function TasksSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}

export function TasksPage() {
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q, 600)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["threads", { q: debouncedQ }],
    queryFn: () =>
      readThreads({
        q: debouncedQ || undefined,
        skip: 0,
        limit: 100,
      }),
  })

  const threads: ThreadPublic[] = data?.data ?? []

  const workflowKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const thread of threads) {
      if (thread.workflow_key) keys.add(thread.workflow_key)
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }, [threads])

  const [workflowKey, setWorkflowKey] = useState<string>("all")

  const visibleTasks = useMemo(() => {
    const filtered =
      workflowKey === "all"
        ? threads
        : threads.filter((thread) => thread.workflow_key === workflowKey)

    const score = (thread: ThreadPublic) => {
      const raw = thread.last_touched_at || thread.created_at
      if (!raw) return 0
      const parsed = new Date(raw).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    return filtered
      .slice()
      .sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title))
  }, [threads, workflowKey])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Threads</h1>
        <p className="text-muted-foreground">Long-lived buckets of work</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              aria-label="Search threads"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search threads…"
            />
          </div>
        </div>

        <div className="w-full flex flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          <div className="sm:w-[260px]">
            <Select value={workflowKey} onValueChange={setWorkflowKey}>
              <SelectTrigger aria-label="Filter by workflow">
                <SelectValue placeholder="All workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workflows</SelectItem>
                {workflowKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {humanizeWorkflowKey(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!isLoading && !isError ? (
        <div className="text-sm text-muted-foreground">
          {visibleTasks.length} thread{visibleTasks.length === 1 ? "" : "s"}
        </div>
      ) : null}

      {isLoading ? (
        <TasksSkeleton />
      ) : isError ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">Couldn’t load Threads</div>
          <div className="text-sm text-muted-foreground">
            Check backend connectivity/auth and that execution tables exist.
          </div>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">No threads found</div>
          <div className="text-sm text-muted-foreground">
            Seed the execution tables or remove filters.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((thread) => (
            <ThreadDialog key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  )
}
