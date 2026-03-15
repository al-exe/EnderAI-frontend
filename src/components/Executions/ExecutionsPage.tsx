import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { type ExecutionPublic, readExecutions } from "@/api/tasks"
import { ExecutionDetailDialog } from "@/components/Tasks/TasksPage"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])

  return debounced
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

function formatBadgeLabel(value: string): string {
  return value.trim().replace(/_/g, " ").toLowerCase()
}

function executionStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const lower = status.toLowerCase()
  if (lower === "success") return "default"
  if (lower === "in_progress") return "secondary"
  if (lower === "failed" || lower === "error") return "destructive"
  return "outline"
}

function ExecutionsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  )
}

export function ExecutionsPage() {
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q, 600)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["executions"],
    queryFn: () =>
      readExecutions({
        skip: 0,
        limit: 200,
      }),
  })

  const executions: ExecutionPublic[] = data?.data ?? []

  const visible = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    if (!needle) return executions

    return executions.filter((e) => {
      const summary = (e.summary ?? "").toLowerCase()
      const threadId = (e.thread_id ?? "").toLowerCase()
      return summary.includes(needle) || threadId.includes(needle)
    })
  }, [debouncedQ, executions])

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  )
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
        <p className="text-muted-foreground">
          Bounded work sessions under a topic
        </p>
      </div>

      <div className="w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search cases"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cases…"
          />
        </div>
      </div>

      {!isLoading && !isError ? (
        <div className="text-sm text-muted-foreground">
          {visible.length} case{visible.length === 1 ? "" : "s"}
        </div>
      ) : null}

      {isLoading ? (
        <ExecutionsSkeleton />
      ) : isError ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">Couldn’t load Cases</div>
          <div className="text-sm text-muted-foreground">
            Check backend connectivity/auth and that case data is available.
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-md border bg-muted/20 p-6">
          <div className="font-medium">No cases found</div>
          <div className="text-sm text-muted-foreground">
            Try clearing your filters.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((execution) => (
            <button
              key={execution.id}
              type="button"
              className="text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => {
                setSelectedExecutionId(execution.id)
                setDetailOpen(true)
              }}
            >
              <Card className="transition-colors hover:bg-muted/50 h-full">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={executionStatusVariant(execution.status)}>
                      {formatBadgeLabel(execution.status)}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {execution.thread_id}
                    </span>
                  </div>
                  <div className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                    {execution.summary ?? "Case"}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(execution.started_at)}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <ExecutionDetailDialog
        executionId={selectedExecutionId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next)
          if (!next) setSelectedExecutionId(null)
        }}
      />
    </div>
  )
}
