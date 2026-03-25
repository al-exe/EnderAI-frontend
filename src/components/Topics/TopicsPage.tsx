import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { Maximize2, Minimize2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { readCases } from "@/api/cases"
import {
  readTopic,
  readTopicRollup,
  readTopics,
  type TopicPublic,
  type TopicsPublic,
  updateTopic,
} from "@/api/topics"
import { SplitDataTable } from "@/components/Common/SplitDataTable"
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
import { Textarea } from "@/components/ui/textarea"
import { useAutoLoadMore } from "@/hooks/useAutoLoadMore"
import useCustomToast from "@/hooks/useCustomToast"
import { useIsMobile } from "@/hooks/useMobile"
import { getClippedTextDisplay, getSignalChipDisplay } from "@/lib/display"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import styles from "./TopicsPage.module.css"

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

const TOPIC_COLUMNS: ColumnDef<TopicPublic>[] = [
  {
    accessorKey: "title",
    header: "Topic",
    meta: {
      width: "18rem",
      cellClassName: styles.topicCell,
    },
    cell: ({ row }) => {
      const title = getClippedTextDisplay(row.original.title)
      const subtitle = getClippedTextDisplay(row.original.workflow_key)

      return (
        <div className={styles.tableTitleCell}>
          <span className={styles.tableTitle} title={title.title}>
            {title.label}
          </span>
          <span className={styles.tableSubtitle} title={subtitle.title}>
            {subtitle.label}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      width: "8rem",
      cellClassName: styles.statusCell,
    },
    cell: ({ row }) => (
      <Badge variant={badgeVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "case_count",
    header: "Cases",
    meta: {
      width: "6rem",
      cellClassName: styles.countCell,
    },
  },
  {
    accessorKey: "last_used_at",
    header: "Last used",
    meta: {
      width: "12rem",
      cellClassName: styles.timestampCell,
    },
    cell: ({ row }) => formatTimestamp(row.original.last_used_at),
  },
]

export function TopicsPage({
  initialSelectedTopicId = null,
}: {
  initialSelectedTopicId?: string | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    initialSelectedTopicId,
  )
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

  useEffect(() => {
    if (initialSelectedTopicId) {
      setSelectedTopicId(initialSelectedTopicId)
      setIsFocusedViewOpen(false)
    }
  }, [initialSelectedTopicId])

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

  const selectedTopicFromList = useMemo<TopicPublic | null>(() => {
    if (!topics.length) return null
    if (selectedTopicId) {
      return topics.find((topic) => topic.id === selectedTopicId) ?? null
    }
    return topics[0]
  }, [selectedTopicId, topics])

  const resolvedSelectedTopicId = selectedTopicId ?? topics[0]?.id ?? null

  const selectedTopicQuery = useQuery({
    enabled: Boolean(resolvedSelectedTopicId),
    queryKey: ["topic", resolvedSelectedTopicId],
    queryFn: () => readTopic(resolvedSelectedTopicId ?? ""),
  })

  const selectedTopic = selectedTopicQuery.data ?? selectedTopicFromList

  const visibleTopics = useMemo(() => {
    if (!selectedTopic) return topics
    if (topics.some((topic) => topic.id === selectedTopic.id)) return topics
    return [selectedTopic, ...topics]
  }, [selectedTopic, topics])

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
      queryClient.setQueryData(["topic", updatedTopic.id], updatedTopic)
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
    <Card className={cn(focused ? styles.focusedCard : styles.splitCard)}>
      <CardHeader>
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderMain}>
            <CardTitle>
              {isEditingTitle ? (
                <div className={styles.editGroup}>
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
                  <div className={styles.editHint}>
                    Enter to save • Esc to cancel
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.editButtonTitle}
                  title="Click to rename topic title"
                  onClick={startTitleEdit}
                >
                  {selectedTopic?.title ?? "Untitled topic"}
                </button>
              )}
            </CardTitle>
            <CardDescription>
              {isEditingDescription ? (
                <div className={styles.editGroup}>
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
                  <div className={styles.editHint}>
                    Enter to save • Shift+Enter for newline • Esc to cancel
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.editButtonDescription}
                  title="Click to rename topic description"
                  onClick={startDescriptionEdit}
                >
                  {selectedTopic?.description ? (
                    selectedTopic.description
                  ) : (
                    <span className={styles.emptyDescription}>
                      No description captured for this topic yet.
                    </span>
                  )}
                </button>
              )}
            </CardDescription>
          </div>

          <div className={styles.actionGroup}>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className={styles.shrinkButton}
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
          styles.detailContent,
          focused ? styles.detailContentFocused : styles.detailContentSplit,
        )}
      >
        <div className={styles.badgeRow}>
          <Badge variant={badgeVariant(selectedTopic?.status ?? "open")}>
            {selectedTopic?.status ?? "open"}
          </Badge>
          <Badge variant="outline">{selectedTopic?.workflow_key}</Badge>
          <Badge variant="outline">
            {selectedTopic?.case_count ?? 0} cases
          </Badge>
        </div>

        <div className={styles.summaryMeta}>
          <div>
            <div className={styles.sectionTitle}>Rollup summary</div>
            <p className={styles.mutedText}>
              {selectedTopic?.rollup_summary || "No rollup summary yet."}
            </p>
          </div>
          <div>
            <div className={styles.sectionTitle}>Last updated</div>
            <p className={styles.mutedText}>
              {formatTimestamp(selectedTopic?.updated_at ?? null)}
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Canonical signals</div>
          {topicRollupQuery.isLoading ? (
            <p className={styles.smallMutedText}>Loading rollup…</p>
          ) : topicRollupQuery.isError ? (
            <p className={styles.errorText}>Couldn’t load the Topic rollup.</p>
          ) : (
            <div className={styles.chipList}>
              {[
                ...(topicRollupQuery.data?.canonical_files ?? []),
                ...(topicRollupQuery.data?.canonical_errors ?? []),
              ]
                .slice(0, 8)
                .map((signal) => {
                  const display = getSignalChipDisplay(signal)

                  return (
                    <Badge
                      key={signal}
                      variant="outline"
                      className={styles.chip}
                      title={display.title}
                    >
                      <span className={styles.chipLabel}>{display.label}</span>
                    </Badge>
                  )
                })}
              {!(
                topicRollupQuery.data?.canonical_files.length ||
                topicRollupQuery.data?.canonical_errors.length
              ) ? (
                <span className={styles.mutedText}>
                  No canonical signals yet.
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Recent Cases</div>
          {topicCasesQuery.isLoading ? (
            <p className={styles.smallMutedText}>Loading Cases…</p>
          ) : topicCasesQuery.isError ? (
            <p className={styles.errorText}>
              Couldn’t load Cases for this Topic.
            </p>
          ) : (topicCasesQuery.data?.data.length ?? 0) === 0 ? (
            <p className={styles.smallMutedText}>
              No Cases under this Topic yet.
            </p>
          ) : (
            <div className={styles.recentCasesList}>
              {topicCasesQuery.data?.data.map((caseItem) => (
                <button
                  key={caseItem.id}
                  type="button"
                  className={styles.recentCaseButton}
                  onClick={() =>
                    navigate({
                      to: "/cases",
                      search: { caseId: caseItem.id },
                    })
                  }
                >
                  <div className={styles.recentCaseHeader}>
                    <div className={styles.recentCaseTitle}>
                      {caseItem.title}
                    </div>
                    <Badge variant={badgeVariant(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>
                  <p className={styles.recentCaseSummary}>
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

  const isLoadingTopics =
    topicsQuery.isLoading ||
    (Boolean(resolvedSelectedTopicId) &&
      selectedTopicQuery.isLoading &&
      visibleTopics.length === 0)

  return (
    <div className={styles.page}>
      {isLoadingTopics ? (
        <Card>
          <CardContent className={styles.statusCardContent}>
            Loading Topics…
          </CardContent>
        </Card>
      ) : topicsQuery.isError ? (
        <Card>
          <CardContent className={styles.errorCardContent}>
            Couldn’t load Topics.
          </CardContent>
        </Card>
      ) : visibleTopics.length === 0 ? (
        <Card>
          <CardContent className={styles.statusCardContent}>
            No Topics yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              styles.splitLayout,
              isSplitViewOpen
                ? styles.splitLayoutOpen
                : styles.splitLayoutClosed,
            )}
          >
            <Card
              data-testid="topics-primary-pane"
              className={styles.primaryPane}
            >
              <CardHeader>
                <CardTitle>Topics</CardTitle>
                <CardDescription>
                  {describeLoadedCount(
                    visibleTopics.length,
                    totalTopics,
                    "topic",
                    "topics",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className={styles.primaryContent}>
                <div className={styles.primaryTableWrap}>
                  <SplitDataTable
                    columns={TOPIC_COLUMNS}
                    data={visibleTopics}
                    getRowId={(topic) => topic.id}
                    selectedRowId={selectedTopic?.id ?? null}
                    viewportRef={setTopicsListViewport}
                    loadMoreRef={topicsLoadMoreRef}
                    hasMore={topicsQuery.hasNextPage}
                    getRowClassName={() => "group"}
                    onRowClick={(topic) => {
                      setSelectedTopicId(topic.id)
                      setIsSplitViewOpen(true)
                      setIsFocusedViewOpen(false)
                      void navigate({
                        to: "/topics",
                        search: { topicId: topic.id },
                      })
                    }}
                  />
                </div>

                {topicsQuery.isFetchingNextPage ? (
                  <p className={styles.loadMoreText}>Loading more Topics…</p>
                ) : null}
              </CardContent>
            </Card>

            {isSplitViewOpen ? renderTopicDetailCard(false) : null}
          </div>

          <Dialog open={isFocusedViewOpen} onOpenChange={setIsFocusedViewOpen}>
            <DialogContent
              showCloseButton={false}
              className={styles.dialogContent}
            >
              {renderTopicDetailCard(true)}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
