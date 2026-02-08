import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  readLibraryItems,
  readLibraryWorkflowKeys,
  type LibraryItemKind,
  type LibraryItemPublic,
} from "@/api/library"
import { Badge } from "@/components/ui/badge"
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

function kindBadgeVariant(kind: LibraryItemKind):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (kind) {
    case "recipe":
      return "default"
    case "checklist":
      return "secondary"
    case "decision":
      return "outline"
    case "pitfall":
      return "destructive"
  }
}

function normalizeBodyMdc(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
}

function dropLeadingHeading(body: string): string {
  const normalized = normalizeBodyMdc(body)
  const lines = normalized.split("\n")

  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift()
  }

  if (lines.length > 0 && /^#+\\s/.test(lines[0])) {
    lines.shift()
    while (lines.length > 0 && lines[0].trim().length === 0) {
      lines.shift()
    }
  }

  return lines.join("\n")
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

function BodyPreview({ body }: { body: string }) {
  const preview = useMemo(() => {
    const normalized = dropLeadingHeading(body).replace(/\s+/g, " ").trim()
    if (normalized.length <= 220) return normalized
    return normalized.slice(0, 220).trimEnd() + "…"
  }, [body])

  return <p className="text-sm text-muted-foreground">{preview}</p>
}

function LibraryCard({
  item,
  bucketName,
}: {
  item: LibraryItemPublic
  bucketName: string
}) {
  const body = useMemo(() => normalizeBodyMdc(item.body_mdc), [item.body_mdc])
  const createdAt = formatTimestamp(item.created_at)
  const lastUsedAt = formatTimestamp(item.last_used_at)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Open library item: ${item.title}`}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={kindBadgeVariant(item.kind)}>{item.kind}</Badge>
                {item.promotion_mode === "user" && (
                  <Badge variant="secondary">user</Badge>
                )}
              </div>
              <div className="font-semibold leading-tight">{item.title}</div>
            </CardHeader>
            <CardContent className="space-y-2">
              <BodyPreview body={body} />
              <div className="text-xs text-muted-foreground">
                {createdAt ? `Created ${createdAt}` : null}
                {createdAt && lastUsedAt ? " • " : null}
                {lastUsedAt ? `Last used ${lastUsedAt}` : null}
              </div>
            </CardContent>
          </Card>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={kindBadgeVariant(item.kind)}>{item.kind}</Badge>
            {item.promotion_mode === "user" && (
              <Badge variant="secondary">user</Badge>
            )}
            <div className="text-xs text-muted-foreground">{bucketName}</div>
          </div>
          <DialogTitle>{item.title}</DialogTitle>
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

function LibraryListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

type BucketGroup = {
  workflowKey: string
  bucketName: string
  items: LibraryItemPublic[]
}

function groupByBucket(
  items: LibraryItemPublic[],
  bucketNameByKey: Map<string, string>,
): BucketGroup[] {
  const map = new Map<string, BucketGroup>()

  for (const item of items) {
    const workflowKey = item.workflow_key || "(none)"
    const bucketName =
      bucketNameByKey.get(workflowKey) || humanizeWorkflowKey(workflowKey)

    const existing = map.get(workflowKey)
    if (existing) {
      existing.items.push(item)
      continue
    }

    map.set(workflowKey, { workflowKey, bucketName, items: [item] })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.bucketName.localeCompare(b.bucketName),
  )
}

export function LibraryList() {
  const [workflowKey, setWorkflowKey] = useState<string>("")
  const [qInput, setQInput] = useState<string>("")

  const q = useDebouncedValue(qInput, 750)

  const bucketsQuery = useQuery({
    queryKey: ["libraryBuckets"],
    queryFn: () => readLibraryWorkflowKeys({ current_only: true }),
  })

  const bucketNameByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bucketsQuery.data?.data ?? []) {
      map.set(b.workflow_key, b.bucket_name)
    }
    return map
  }, [bucketsQuery.data])

  const itemsQuery = useQuery({
    queryKey: ["library", { workflowKey, q }],
    queryFn: () =>
      readLibraryItems({
        workflow_key: workflowKey,
        q,
        current_only: true,
        skip: 0,
        limit: 200,
      }),
  })

  if (itemsQuery.isLoading) {
    return <LibraryListSkeleton />
  }

  if (itemsQuery.isError) {
    return (
      <div className="rounded-lg border p-4">
        <div className="font-medium">Couldn’t load Library</div>
        <div className="text-sm text-muted-foreground">
          {(itemsQuery.error as Error).message}
        </div>
      </div>
    )
  }

  if (!itemsQuery.data) {
    return <LibraryListSkeleton />
  }

  const items = itemsQuery.data.data
  const groups = groupByBucket(items, bucketNameByKey)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="w-full">
          <div className="text-sm font-medium mb-1">Search</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title/body/bucket"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full flex flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          <div className="sm:w-[260px]">
            <div className="text-sm font-medium mb-1">Bucket</div>
            <Select
              value={workflowKey || "all"}
              onValueChange={(v) => setWorkflowKey(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All buckets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buckets</SelectItem>
                {bucketsQuery.data?.data.map((b) => (
                  <SelectItem key={b.workflow_key} value={b.workflow_key}>
                    {b.bucket_name} ({b.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {itemsQuery.data.count} item{itemsQuery.data.count === 1 ? "" : "s"}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No library items found</h3>
          <p className="text-muted-foreground">Try clearing your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.workflowKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{group.bucketName}</div>
                <div className="text-sm text-muted-foreground">
                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {group.items.map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    bucketName={group.bucketName}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
