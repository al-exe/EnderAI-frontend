import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"

import {
  readLibraryItems,
  readLibraryWorkflowKeys,
  type LibraryItemKind,
  type LibraryItemPublic,
} from "@/api/library"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

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

function BodyPreview({ body }: { body: string }) {
  const preview = useMemo(() => {
    const normalized = body.replace(/\s+/g, " ").trim()
    if (normalized.length <= 220) return normalized
    return normalized.slice(0, 220) + "…"
  }, [body])

  return <p className="text-sm text-muted-foreground">{preview}</p>
}

function LibraryCard({ item }: { item: LibraryItemPublic }) {
  return (
    <Card>
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
        <BodyPreview body={item.body_mdc} />
        <div className="text-xs text-muted-foreground">
          {item.created_at
            ? `Created ${new Date(item.created_at).toLocaleString()}`
            : null}
          {item.created_at && item.last_used_at ? " • " : null}
          {item.last_used_at
            ? `Last used ${new Date(item.last_used_at).toLocaleString()}`
            : null}
        </div>
      </CardContent>
    </Card>
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

function groupByWorkflowKey(items: LibraryItemPublic[]) {
  const map = new Map<string, LibraryItemPublic[]>()
  for (const item of items) {
    const key = item.workflow_key || "(none)"
    const list = map.get(key)
    if (list) {
      list.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export function LibraryList() {
  const [workflowKey, setWorkflowKey] = useState<string>("")
  const [q, setQ] = useState<string>("")
  const [kind, setKind] = useState<LibraryItemKind | "all">("all")

  const bucketsQuery = useQuery({
    queryKey: ["libraryBuckets"],
    queryFn: () => readLibraryWorkflowKeys({ current_only: true }),
  })

  const itemsQuery = useQuery({
    queryKey: ["library", { workflowKey, q, kind }],
    queryFn: () =>
      readLibraryItems({
        workflow_key: workflowKey,
        q,
        kind: kind === "all" ? undefined : kind,
        current_only: true,
        skip: 0,
        limit: 200,
      }),
  })

  if (itemsQuery.isLoading || !itemsQuery.data) {
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

  const items = itemsQuery.data.data
  const groups = groupByWorkflowKey(items)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">Search</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title/body"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

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
                  {b.workflow_key} ({b.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:w-[200px]">
          <div className="text-sm font-medium mb-1">Kind</div>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as LibraryItemKind | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="recipe">recipe</SelectItem>
              <SelectItem value="checklist">checklist</SelectItem>
              <SelectItem value="decision">decision</SelectItem>
              <SelectItem value="pitfall">pitfall</SelectItem>
            </SelectContent>
          </Select>
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
          {groups.map(([groupKey, groupItems]) => (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{groupKey}</div>
                <div className="text-sm text-muted-foreground">
                  {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {groupItems.map((item) => (
                  <LibraryCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
