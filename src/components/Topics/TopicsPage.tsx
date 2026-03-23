import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Maximize2, Minimize2, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { readCases } from "@/api/cases"
import {
  readTopicRollup,
  readTopics,
  type TopicPublic,
  type TopicsPublic,
  updateTopic,
} from "@/api/topics"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAutoLoadMore } from "@/hooks/useAutoLoadMore"
import useCustomToast from "@/hooks/useCustomToast"
import { useIsMobile } from "@/hooks/useMobile"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"

const TOPICS_PAGE_SIZE = 25

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function badgeVariant(
  status: string,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  const normalized = status.trim().toLowerCase()
  if (["done", "closed", "resolved"].includes(normalized)) return "success"
  if (["failed", "error", "blocked"].includes(normalized)) return "destructive"
  if (["running", "active", "in progress"].includes(normalized))
    return "secondary"
  return "outline"
}

function replaceTopicInPages(
  current: InfiniteData<TopicsPublic> | undefined,
  updatedTopic: TopicPublic,
): InfiniteData<TopicsPublic> | undefined {
  if (!current) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.map((topic) =>
        topic.id === updatedTopic.id ? updatedTopic : topic,
      ),
    })),
  }
}

function describeLoadedCount(
  loaded: number,
  total: number,
  singular: string,
  plural: string,
): string {
  if (total === 0) return `0 ${plural}`
  if (loaded < total)
    return `${loaded} of ${total} ${total === 1 ? singular : plural}`
  return `${total} ${total === 1 ? singular : plural}`
}

export function TopicsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const skipTitleBlurRef = useRef(false)
  const skipDescriptionBlurRef = useRef(false)
  const [topicsListViewport, setTopicsListViewport] =
    useState<HTMLDivElement | null>(null)
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(true)
  const [isFocusedViewOpen, setIsFocusedViewOpen] = useState(false)

  const topicsQuery = useInfiniteQuery({
    queryKey: ["topics"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readTopics({
        skip: pageParam,
        limit: TOPICS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.data.length,
        0,
      )
      return loaded < lastPage.count ? loaded : undefined
    },
  })

  const topics = useMemo(
    () => topicsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [topicsQuery.data],
  )
  const totalTopics = topicsQuery.data?.pages[0]?.count ?? topics.length

  const selectedTopic = useMemo<TopicPublic | null>(() => {
    if (!topics.length) return null
    return topics.find((topic) => topic.id === selectedTopicId) ?? topics[0]
  }, [selectedTopicId, topics])

  const topicCasesQuery = useQuery({
    enabled: Boolean(selectedTopic?.id),
    queryKey: ["topicCases", selectedTopic?.id],
    queryFn: () =>
      readCases({ topic_id: selectedTopic?.id ?? undefined, limit: 20 }),
  })

  const topicRollupQuery = useQuery({
    enabled: Boolean(selectedTopic?.id),
    queryKey: ["topicRollup", selectedTopic?.id],
    queryFn: () => readTopicRollup(selectedTopic?.id ?? ""),
  })

  const updateTopicMutation = useMutation({
    mutationFn: ({
      topicId,
      title,
      description,
    }: {
      topicId: string
      title?: string
      description?: string | null
    }) => updateTopic(topicId, { title, description }),
    onSuccess: (updatedTopic) => {
      queryClient.setQueryData<InfiniteData<TopicsPublic> | undefined>(
        ["topics"],
        (current) => replaceTopicInPages(current, updatedTopic),
      )
      queryClient.invalidateQueries({
        queryKey: ["topicRollup", updatedTopic.id],
      })
    },
    onError: handleError.bind(showErrorToast),
  })

  const cancelTitleEdit = () => {
    skipTitleBlurRef.current = false
    setIsEditingTitle(false)
    setTitleDraft(selectedTopic?.title ?? "")
  }

  const cancelDescriptionEdit = () => {
    skipDescriptionBlurRef.current = false
    setIsEditingDescription(false)
    setDescriptionDraft(selectedTopic?.description ?? "")
  }

  const startTitleEdit = () => {
    skipTitleBlurRef.current = false
    setTitleDraft(selectedTopic?.title ?? "")
    setIsEditingTitle(true)
  }

  const startDescriptionEdit = () => {
    skipDescriptionBlurRef.current = false
    setDescriptionDraft(selectedTopic?.description ?? "")
    setIsEditingDescription(true)
  }

  const saveTitle = async () => {
    if (!selectedTopic) return

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      showErrorToast("Topic title can't be empty.")
      return
    }

    if (nextTitle === selectedTopic.title.trim()) {
      cancelTitleEdit()
      return
    }

    try {
      await updateTopicMutation.mutateAsync({
        topicId: selectedTopic.id,
        title: nextTitle,
      })
      setIsEditingTitle(false)
      showSuccessToast("Topic title updated")
    } catch {
      return
    }
  }

  const saveDescription = async () => {
    if (!selectedTopic) return

    const nextDescription = descriptionDraft.trim()
    const currentDescription = selectedTopic.description?.trim() ?? ""
    if (nextDescription === currentDescription) {
      cancelDescriptionEdit()
      return
    }

    try {
      await updateTopicMutation.mutateAsync({
        topicId: selectedTopic.id,
        description: nextDescription || null,
      })
      setIsEditingDescription(false)
      showSuccessToast(
        nextDescription
          ? "Topic description updated"
          : "Topic description cleared",
      )
    } catch {
      return
    }
  }

  const topicsLoadMoreRef = useAutoLoadMore<HTMLDivElement>({
    enabled: !topicsQuery.isLoading,
    hasMore: topicsQuery.hasNextPage,
    isLoadingMore: topicsQuery.isFetchingNextPage,
    onLoadMore: () => {
      if (!topicsQuery.hasNextPage || topicsQuery.isFetchingNextPage) return
      void topicsQuery.fetchNextPage()
    },
    root: isMobile ? null : topicsListViewport,
  })

  const renderTopicDetailCard = (focused: boolean) => (
    <Card
      className={cn(
        focused
          ? "flex h-full min-w-0 flex-col rounded-none border-0 shadow-none"
          : "lg:flex lg:min-h-0 lg:min-w-0 lg:max-h-full lg:flex-col lg:overflow-hidden",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-4">
            <CardTitle>
              {isEditingTitle ? (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    maxLength={255}
                    value={titleDraft}
                    disabled={updateTopicMutation.isPending}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void saveTitle()
                      }

                      if (e.key === "Escape") {
                        e.preventDefault()
                        skipTitleBlurRef.current = true
                        cancelTitleEdit()
                      }
                    }}
                    onBlur={() => {
                      if (skipTitleBlurRef.current) {
                        skipTitleBlurRef.current = false
                        return
                      }
                      void saveTitle()
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    Enter to save • Esc to cancel
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-fit max-w-full cursor-text text-left underline-offset-4 hover:underline"
                  title="Click to rename topic title"
                  onClick={startTitleEdit}
                >
                  {selectedTopic?.title ?? "Untitled topic"}
                </button>
              )}
            </CardTitle>
            <CardDescription>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    autoFocus
                    rows={4}
                    value={descriptionDraft}
                    disabled={updateTopicMutation.isPending}
                    placeholder="No description captured for this topic yet."
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void saveDescription()
                      }

                      if (e.key === "Escape") {
                        e.preventDefault()
                        skipDescriptionBlurRef.current = true
                        cancelDescriptionEdit()
                      }
                    }}
                    onBlur={() => {
                      if (skipDescriptionBlurRef.current) {
                        skipDescriptionBlurRef.current = false
                        return
                      }
                      void saveDescription()
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    Enter to save • Shift+Enter for newline • Esc to cancel
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full cursor-text text-left underline-offset-4 hover:underline"
                  title="Click to rename topic description"
                  onClick={startDescriptionEdit}
                >
                  {selectedTopic?.description ? (
                    selectedTopic.description
                  ) : (
                    <span className="italic">
                      No description captured for this topic yet.
                    </span>
                  )}
                </button>
              )}
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              aria-label={
                focused ? "Exit focused topic view" : "Open focused topic view"
              }
              data-testid="topic-focus-toggle"
              disabled={!selectedTopic}
              onClick={() => setIsFocusedViewOpen((open) => !open)}
            >
              {focused ? <Minimize2 /> : <Maximize2 />}
            </Button>

            {!focused ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Close split topic view"
                data-testid="topic-split-close"
                disabled={!selectedTopic}
                onClick={() => setIsSplitViewOpen(false)}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "space-y-6 overflow-x-hidden",
          focused
            ? "min-h-0 flex-1 overflow-y-auto"
            : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant={badgeVariant(selectedTopic?.status ?? "open")}>
            {selectedTopic?.status ?? "open"}
          </Badge>
          <Badge variant="outline">{selectedTopic?.workflow_key}</Badge>
          <Badge variant="outline">
            {selectedTopic?.case_count ?? 0} cases
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <div className="font-medium">Rollup summary</div>
            <p className="text-muted-foreground">
              {selectedTopic?.rollup_summary || "No rollup summary yet."}
            </p>
          </div>
          <div>
            <div className="font-medium">Last updated</div>
            <p className="text-muted-foreground">
              {formatTimestamp(selectedTopic?.updated_at ?? null)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-medium">Canonical signals</div>
          {topicRollupQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading rollup…</p>
          ) : topicRollupQuery.isError ? (
            <p className="text-sm text-destructive">
              Couldn’t load the Topic rollup.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ...(topicRollupQuery.data?.canonical_files ?? []),
                ...(topicRollupQuery.data?.canonical_errors ?? []),
              ]
                .slice(0, 8)
                .map((signal) => (
                  <Badge key={signal} variant="outline">
                    {signal}
                  </Badge>
                ))}
              {!(
                topicRollupQuery.data?.canonical_files.length ||
                topicRollupQuery.data?.canonical_errors.length
              ) ? (
                <span className="text-muted-foreground">
                  No canonical signals yet.
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="font-medium">Recent Cases</div>
          {topicCasesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading Cases…</p>
          ) : topicCasesQuery.isError ? (
            <p className="text-sm text-destructive">
              Couldn’t load Cases for this Topic.
            </p>
          ) : (topicCasesQuery.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Cases under this Topic yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topicCasesQuery.data?.data.map((caseItem) => (
                <button
                  key={caseItem.id}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    navigate({
                      to: "/cases",
                      search: { caseId: caseItem.id },
                    })
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{caseItem.title}</div>
                    <Badge variant={badgeVariant(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {caseItem.summary_current ||
                      caseItem.input_summary ||
                      "No summary yet."}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      {topicsQuery.isLoading ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Loading Topics…
          </CardContent>
        </Card>
      ) : topicsQuery.isError ? (
        <Card>
          <CardContent className="text-sm text-destructive">
            Couldn’t load Topics.
          </CardContent>
        </Card>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No Topics yet. Topics will appear here as cases are created under
            the new canonical model.
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-6 lg:min-h-0 lg:flex-1 lg:items-stretch lg:overflow-hidden",
              isSplitViewOpen
                ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
                : "lg:grid-cols-1",
            )}
          >
            <Card className="lg:flex lg:min-h-0 lg:max-h-full lg:flex-col lg:overflow-hidden">
              <CardHeader>
                <CardTitle>Topics</CardTitle>
                <CardDescription>
                  {describeLoadedCount(
                    topics.length,
                    totalTopics,
                    "topic",
                    "topics",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                <div
                  ref={setTopicsListViewport}
                  className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                >
                  <Table className="min-w-max">
                    <TableHeader className="lg:sticky lg:top-0 lg:z-10">
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cases</TableHead>
                        <TableHead>Last used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topics.map((topic) => {
                        const selected = selectedTopic?.id === topic.id
                        return (
                          <TableRow
                            key={topic.id}
                            className={cn(
                              "group cursor-pointer",
                              selected ? "bg-muted/50" : undefined,
                            )}
                            onClick={() => {
                              setSelectedTopicId(topic.id)
                              setIsSplitViewOpen(true)
                              setIsFocusedViewOpen(false)
                            }}
                          >
                            <TableCell className="align-top py-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  {topic.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {topic.workflow_key}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 whitespace-nowrap">
                              <Badge variant={badgeVariant(topic.status)}>
                                {topic.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 whitespace-nowrap">
                              {topic.case_count}
                            </TableCell>
                            <TableCell className="py-2 whitespace-nowrap">
                              {formatTimestamp(topic.last_used_at)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {topicsQuery.hasNextPage ? (
                    <div ref={topicsLoadMoreRef} className="h-4" />
                  ) : null}
                </div>

                {topicsQuery.isFetchingNextPage ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading more Topics…
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {isSplitViewOpen ? renderTopicDetailCard(false) : null}
          </div>

          <Dialog open={isFocusedViewOpen} onOpenChange={setIsFocusedViewOpen}>
            <DialogContent
              showCloseButton={false}
              className="flex h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] flex-col overflow-hidden p-0"
            >
              {renderTopicDetailCard(true)}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
