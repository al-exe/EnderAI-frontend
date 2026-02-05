import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  readRunDetail,
  readTaskRuns,
  readTasks,
  updateTaskTitle,
  type RunDetailPublic,
  type RunEventPublic,
  type RunLibraryRelation,
  type RunMemoryLinkPublic,
  type RunPublic,
  type TaskPublic,
} from "@/api/tasks"
import type { LibraryItemPublic } from "@/api/library"
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
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
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
  relation: RunLibraryRelation,
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

function MemoryItemDialog({
  open,
  onOpenChange,
  item,
  bucketName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LibraryItemPublic | null
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
              <Badge variant="outline">memory</Badge>
            )}
            {item?.promotion_mode === "user" && (
              <Badge variant="secondary">user</Badge>
            )}
            {bucketName ? (
              <div className="text-xs text-muted-foreground">{bucketName}</div>
            ) : null}
          </div>
          <DialogTitle>{item?.title ?? "Memory item"}</DialogTitle>
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

function RunDetailDialog({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError } = useQuery<RunDetailPublic>({
    queryKey: ["runDetail", runId],
    queryFn: () => readRunDetail(runId || ""),
    enabled: open && Boolean(runId),
  })

  const [memoryOpen, setMemoryOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<LibraryItemPublic | null>(
    null,
  )

  const grouped = useMemo(() => {
    const groups: Record<RunLibraryRelation, RunMemoryLinkPublic[]> = {
      used: [],
      created: [],
      promoted: [],
      superseded: [],
    }

    for (const link of data?.memory_links ?? []) {
      groups[link.relation].push(link)
    }

    return groups
  }, [data?.memory_links])

  const run = data?.run
  const startedAt = formatTimestampNoSeconds(run?.started_at ?? null)
  const endedAt = formatTimestampNoSeconds(run?.ended_at ?? null)

  const bucketName = selectedMemory
    ? humanizeWorkflowKey(selectedMemory.workflow_key)
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {run?.status ? (
                <Badge variant={runStatusVariant(run.status)}>
                  {formatBadgeLabel(run.status)}
                </Badge>
              ) : null}
              {run?.id ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {run.id}
                </span>
              ) : null}
            </div>
            <DialogTitle>{run?.summary ?? "Run detail"}</DialogTitle>
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
                  <h3 className="text-sm font-semibold tracking-tight">Memory</h3>
                </div>

                <div className="space-y-4">
                  {(Object.keys(grouped) as RunLibraryRelation[]).map(
                    (relation) => {
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
                                key={`${relation}:${link.library_item.id}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="justify-start max-w-full"
                                onClick={() => {
                                  setSelectedMemory(link.library_item)
                                  setMemoryOpen(true)
                                }}
                              >
                                <span className="truncate">
                                  {link.library_item.title}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    },
                  )}

                  {(data?.memory_links?.length ?? 0) === 0 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No memory links recorded for this run.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Audit Trail
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
                      No run events recorded yet.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MemoryItemDialog
        open={memoryOpen}
        onOpenChange={(next) => {
          setMemoryOpen(next)
          if (!next) setSelectedMemory(null)
        }}
        item={selectedMemory}
        bucketName={bucketName}
      />
    </>
  )
}

function RunEventRow({ event }: { event: RunEventPublic }) {
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

function TaskDialog({
  task,
}: {
  task: TaskPublic
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [taskTitle, setTaskTitle] = useState(task.title)
  const [isRenamingTitle, setIsRenamingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [titleError, setTitleError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    setTaskTitle(task.title)
    if (!isRenamingTitle) setTitleDraft(task.title)
  }, [task.title, isRenamingTitle])

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
      updateTaskTitle(task.id, { title: nextTitle }),
    onSuccess: (updated) => {
      setTaskTitle(updated.title)
      setTitleDraft(updated.title)
      setIsRenamingTitle(false)
      setTitleError(null)
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: () => {
      setTitleError("Couldn’t rename task. Check backend connectivity/auth.")
    },
  })

  const cancelRename = () => {
    skipBlurCommitRef.current = false
    setIsRenamingTitle(false)
    setTitleDraft(taskTitle)
    setTitleError(null)
  }

  const commitRename = () => {
    const next = titleDraft.trim()
    if (!next) {
      setTitleError("Title can’t be empty.")
      return
    }

    if (next === taskTitle.trim()) {
      cancelRename()
      return
    }

    renameMutation.mutate(next)
  }
  const { data, isLoading, isError } = useQuery({
    queryKey: ["taskRuns", task.id],
    queryFn: () => readTaskRuns(task.id),
    enabled: open,
  })

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runOpen, setRunOpen] = useState(false)

  const createdAt = formatTimestamp(task.created_at)
  const lastTouchedAt = formatTimestamp(task.last_touched_at)
  const bucketName = humanizeWorkflowKey(task.workflow_key)

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
            aria-label={`Open task: ${taskTitle}`}
            className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={taskStatusVariant(task.status)}>
                    {formatBadgeLabel(task.status)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">{bucketName}</div>
                </div>
                <div className="font-semibold leading-tight">{taskTitle}</div>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.goal ? (
                  <p className="text-sm text-muted-foreground">{task.goal}</p>
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
              <Badge variant={taskStatusVariant(task.status)}>
                {formatBadgeLabel(task.status)}
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
                    setTitleDraft(taskTitle)
                    setIsRenamingTitle(true)
                    setTitleError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    setTitleDraft(taskTitle)
                    setIsRenamingTitle(true)
                    setTitleError(null)
                  }}
                >
                  {taskTitle}
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
                {task.goal ?? (
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
                {task.acceptance_criteria ?? (
                  <span className="italic text-muted-foreground">
                    No acceptance criteria recorded.
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold tracking-tight">Runs</div>
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
                  <div className="font-medium">Couldn’t load Runs</div>
                  <div className="text-sm text-muted-foreground">
                    Check backend connectivity and auth.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.data ?? []).map((run: RunPublic) => (
                    <button
                      key={run.id}
                      type="button"
                      className="w-full rounded-md border p-3 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSelectedRunId(run.id)
                        setRunOpen(true)
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-medium leading-tight">
                            {run.summary ?? "Run"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(run.started_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={runStatusVariant(run.status)}>
                            {formatBadgeLabel(run.status)}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}

                  {(data?.data?.length ?? 0) === 0 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No runs recorded yet.
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <RunDetailDialog
        runId={selectedRunId}
        open={runOpen}
        onOpenChange={(next) => {
          setRunOpen(next)
          if (!next) setSelectedRunId(null)
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
    queryKey: ["tasks", { q: debouncedQ }],
    queryFn: () =>
      readTasks({
        q: debouncedQ || undefined,
        skip: 0,
        limit: 100,
      }),
  })

  const tasks: TaskPublic[] = data?.data ?? []

  const workflowKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const task of tasks) {
      if (task.workflow_key) keys.add(task.workflow_key)
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const [workflowKey, setWorkflowKey] = useState<string>("all")

  const visibleTasks = useMemo(() => {
    const filtered =
      workflowKey === "all"
        ? tasks
        : tasks.filter((task) => task.workflow_key === workflowKey)

    const score = (task: TaskPublic) => {
      const raw = task.last_touched_at || task.created_at
      if (!raw) return 0
      const parsed = new Date(raw).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    return filtered
      .slice()
      .sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title))
  }, [tasks, workflowKey])

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">The state of all of your work</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={workflowKey} onValueChange={setWorkflowKey}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Workflow" />
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

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQ("")
              setWorkflowKey("all")
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TasksSkeleton />
      ) : isError ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">Couldn’t load Tasks</div>
          <div className="text-sm text-muted-foreground">
            Check backend connectivity/auth and that memory tables exist.
          </div>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">No tasks found</div>
          <div className="text-sm text-muted-foreground">
            Seed the memory tables or remove filters.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((task) => (
            <TaskDialog key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
