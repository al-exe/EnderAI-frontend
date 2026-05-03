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

import { type CasePublic, readCases } from "@/api/cases"
import {
  readTopic,
  readTopics,
  type TopicPublic,
  type TopicsPublic,
  updateTopic,
} from "@/api/topics"
import { SplitDataTable } from "@/components/Common/SplitDataTable"
import { useDemoMode } from "@/components/demo-mode-provider"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAutoLoadMore } from "@/hooks/useAutoLoadMore"
import useCustomToast from "@/hooks/useCustomToast"
import { useIsMobile } from "@/hooks/useMobile"
import { getClippedTextDisplay, getSignalChipDisplay } from "@/lib/display"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import styles from "./TopicsPage.module.css"

const TOPICS_PAGE_SIZE = 25
const DEFAULT_TOPIC_STATUSES = [
  "open",
  "in progress",
  "blocked",
  "resolved",
  "closed",
] as const

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

function formatStatusLabel(status: string): string {
  return status.replace(/\b\w/g, (char) => char.toUpperCase())
}

function getTopicStatusOptions(status: string | null | undefined): string[] {
  const normalizedStatus = status?.trim().toLowerCase()

  if (!normalizedStatus) return [...DEFAULT_TOPIC_STATUSES]

  return Array.from(new Set([normalizedStatus, ...DEFAULT_TOPIC_STATUSES]))
}

function topicStatusTriggerClassName(status: string): string {
  const normalized = status.trim().toLowerCase()

  if (["done", "closed", "resolved"].includes(normalized)) {
    return "border-transparent bg-emerald-500 text-white hover:bg-emerald-500/90 focus-visible:ring-emerald-500/20"
  }

  if (["failed", "error", "blocked"].includes(normalized)) {
    return "border-transparent bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
  }

  if (["running", "active", "in progress"].includes(normalized)) {
    return "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90"
  }

  return "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
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

function SignalChipList({
  items,
  emptyText,
}: {
  items: string[]
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className={styles.smallMutedText}>{emptyText}</p>
  }

  return (
    <div className={styles.chipList}>
      {items.map((item, index) => {
        const display = getSignalChipDisplay(item)

        return (
          <Badge
            key={`${item}-${index}`}
            variant="outline"
            className={cn(styles.chip, "normal-case")}
            title={display.title}
          >
            <span className={styles.chipLabel}>{display.label}</span>
          </Badge>
        )
      })}
    </div>
  )
}

function TextList({
  items,
  emptyText,
}: {
  items: string[]
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className={styles.smallMutedText}>{emptyText}</p>
  }

  return (
    <ul className={styles.textList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

function CommandList({ commands }: { commands: CasePublic["commands"] }) {
  if (commands.length === 0) {
    return <p className={styles.smallMutedText}>No commands captured yet.</p>
  }

  return (
    <div className={styles.recordStack}>
      {commands.map((command, index) => (
        <div
          key={`${command.cmd}-${command.ts ?? index}`}
          className={styles.recordCard}
        >
          <div className={styles.monoText}>{command.cmd}</div>
          {command.purpose || command.salient_result || command.ts ? (
            <div className={styles.metaStack}>
              {command.purpose ? <p>{command.purpose}</p> : null}
              {command.salient_result ? <p>{command.salient_result}</p> : null}
              {command.ts ? <p>{formatTimestamp(command.ts)}</p> : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function TopicContextIntelligence({
  topic,
}: {
  topic: TopicPublic | undefined
}) {
  if (!topic) return null

  const hasContextMaterial =
    Boolean(topic.rollup_summary) ||
    topic.canonical_files.length > 0 ||
    topic.canonical_symbols.length > 0 ||
    topic.canonical_errors.length > 0 ||
    topic.canonical_symptoms.length > 0 ||
    topic.pinned_takeaways.length > 0 ||
    topic.ambiguity_notes.length > 0 ||
    topic.open_questions.length > 0 ||
    topic.negative_history.length > 0 ||
    topic.representative_case_ids.length > 0 ||
    topic.recent_case_ids.length > 0 ||
    topic.aliases.length > 0 ||
    topic.vocabulary.length > 0

  return (
    <div className={styles.section} data-testid="topic-context-intelligence">
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Context intelligence</div>
          <p className={styles.sectionIntro}>
            Durable Topic memory used to shape future Context Packs.
          </p>
        </div>
        <div className={styles.contextMeta}>
          <Badge variant="outline">{topic.case_count} cases</Badge>
          <Badge variant="outline">Rollup v{topic.rollup_version}</Badge>
          <Badge variant="outline">
            Updated {formatTimestamp(topic.updated_at ?? null)}
          </Badge>
        </div>
      </div>

      {!hasContextMaterial ? (
        <p className={styles.smallMutedText}>
          No Topic-level context has been promoted yet.
        </p>
      ) : (
        <div className={styles.contextPackStack}>
          <div className={styles.contextPanel}>
            <div className={styles.signalTitle}>Briefing seed</div>
            <p className={styles.mutedText}>
              {topic.rollup_summary || "No rollup summary yet."}
            </p>
          </div>

          <div className={styles.contextGrid}>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Pinned takeaways</div>
              <TextList
                items={topic.pinned_takeaways}
                emptyText="No takeaways promoted yet."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Open questions</div>
              <TextList
                items={topic.open_questions}
                emptyText="No open questions promoted yet."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Negative history</div>
              <TextList
                items={topic.negative_history}
                emptyText="No avoid-list promoted yet."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Ambiguity notes</div>
              <TextList
                items={topic.ambiguity_notes}
                emptyText="No ambiguity notes promoted yet."
              />
            </div>
          </div>

          <div className={styles.contextPanel}>
            <div className={styles.signalTitle}>Canonical signals</div>
            <div className={styles.signalGroups}>
              <div>
                <div className={styles.signalTitle}>Files</div>
                <SignalChipList
                  items={topic.canonical_files}
                  emptyText="No canonical files promoted yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Symbols</div>
                <SignalChipList
                  items={topic.canonical_symbols}
                  emptyText="No canonical symbols promoted yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Errors</div>
                <SignalChipList
                  items={topic.canonical_errors}
                  emptyText="No canonical errors promoted yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Symptoms</div>
                <SignalChipList
                  items={topic.canonical_symptoms}
                  emptyText="No canonical symptoms promoted yet."
                />
              </div>
            </div>
          </div>

          <div className={styles.contextGrid}>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Vocabulary</div>
              <SignalChipList
                items={[...topic.aliases, ...topic.vocabulary]}
                emptyText="No vocabulary promoted yet."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Case anchors</div>
              <div className={styles.anchorStats}>
                <Badge variant="outline">
                  {topic.representative_case_ids.length} representative
                </Badge>
                <Badge variant="outline">
                  {topic.recent_case_ids.length} recent
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
      const subtitle = getClippedTextDisplay(
        row.original.description?.trim() ||
          "No description captured for this topic yet.",
      )

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
  const { isDemoMode } = useDemoMode()
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
  const lastDemoModeRef = useRef(isDemoMode)

  useEffect(() => {
    if (initialSelectedTopicId) {
      setSelectedTopicId(initialSelectedTopicId)
      setIsFocusedViewOpen(false)
    }
  }, [initialSelectedTopicId])

  useEffect(() => {
    if (lastDemoModeRef.current === isDemoMode) return

    lastDemoModeRef.current = isDemoMode
    setSelectedTopicId(null)
    setIsSplitViewOpen(true)
    setIsFocusedViewOpen(false)
    void navigate({
      to: "/topics",
      search: {},
      replace: true,
    })
  }, [isDemoMode, navigate])

  const topicsQuery = useInfiniteQuery({
    queryKey: ["topics", isDemoMode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readTopics({
        skip: pageParam,
        limit: TOPICS_PAGE_SIZE,
        demo: isDemoMode,
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
    queryKey: ["topic", resolvedSelectedTopicId, isDemoMode],
    queryFn: () =>
      readTopic(resolvedSelectedTopicId ?? "", { demo: isDemoMode }),
  })

  const selectedTopic = selectedTopicQuery.data ?? selectedTopicFromList

  const visibleTopics = useMemo(() => {
    if (!selectedTopic) return topics
    if (topics.some((topic) => topic.id === selectedTopic.id)) return topics
    return [selectedTopic, ...topics]
  }, [selectedTopic, topics])

  const topicCasesQuery = useQuery({
    enabled: Boolean(selectedTopic?.id),
    queryKey: ["topicCases", selectedTopic?.id, isDemoMode],
    queryFn: () =>
      readCases({
        topic_id: selectedTopic?.id ?? undefined,
        limit: 500,
        demo: isDemoMode,
      }),
  })

  const aggregatedSignals = useMemo(() => {
    const cases = topicCasesQuery.data?.data ?? []
    const dedupe = (values: string[]) => Array.from(new Set(values))

    return {
      files: dedupe(cases.flatMap((caseItem) => caseItem.files)),
      symbols: dedupe(cases.flatMap((caseItem) => caseItem.symbols)),
      errors: dedupe(cases.flatMap((caseItem) => caseItem.errors)),
      symptoms: dedupe(cases.flatMap((caseItem) => caseItem.symptoms)),
    }
  }, [topicCasesQuery.data])

  const aggregatedCommands = useMemo(
    () =>
      topicCasesQuery.data?.data.flatMap((caseItem) => caseItem.commands) ?? [],
    [topicCasesQuery.data],
  )

  const recentCases = useMemo(
    () => topicCasesQuery.data?.data.slice(0, 20) ?? [],
    [topicCasesQuery.data],
  )

  const updateTopicMutation = useMutation({
    mutationFn: ({
      topicId,
      title,
      description,
      status,
    }: {
      topicId: string
      title?: string
      description?: string | null
      status?: string
    }) =>
      updateTopic(
        topicId,
        { title, description, status },
        { demo: isDemoMode },
      ),
    onSuccess: (updatedTopic) => {
      queryClient.setQueryData<InfiniteData<TopicsPublic> | undefined>(
        ["topics", isDemoMode],
        (current) => replaceTopicInPages(current, updatedTopic),
      )
      queryClient.setQueryData(
        ["topic", updatedTopic.id, isDemoMode],
        updatedTopic,
      )
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

  const saveStatus = async (nextStatus: string) => {
    if (!selectedTopic) return

    const normalizedStatus = nextStatus.trim().toLowerCase()
    const currentStatus = selectedTopic.status.trim().toLowerCase()

    if (!normalizedStatus || normalizedStatus === currentStatus) return

    try {
      await updateTopicMutation.mutateAsync({
        topicId: selectedTopic.id,
        status: normalizedStatus,
      })
      showSuccessToast(
        `Topic status updated to ${formatStatusLabel(normalizedStatus)}`,
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
          <Select
            value={(selectedTopic?.status ?? "open").trim().toLowerCase()}
            disabled={!selectedTopic || updateTopicMutation.isPending}
            onValueChange={(value) => {
              void saveStatus(value)
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Topic status"
              data-testid="topic-status-trigger"
              className={cn(
                "h-7 min-w-[8rem] rounded-full px-2.5 py-1 text-xs font-medium capitalize shadow-none [&_svg]:text-current",
                topicStatusTriggerClassName(selectedTopic?.status ?? "open"),
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {getTopicStatusOptions(selectedTopic?.status).map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <TopicContextIntelligence topic={selectedTopic ?? undefined} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Signals</div>
          {topicCasesQuery.isLoading ? (
            <p className={styles.smallMutedText}>Loading Cases…</p>
          ) : topicCasesQuery.isError ? (
            <p className={styles.errorText}>
              Couldn’t aggregate signals for this Topic.
            </p>
          ) : (
            <div className={styles.signalGroups}>
              <div>
                <div className={styles.signalTitle}>Files</div>
                <SignalChipList
                  items={aggregatedSignals.files}
                  emptyText="No files captured yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Symbols</div>
                <SignalChipList
                  items={aggregatedSignals.symbols}
                  emptyText="No symbols captured yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Errors</div>
                <SignalChipList
                  items={aggregatedSignals.errors}
                  emptyText="No errors captured yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Symptoms</div>
                <SignalChipList
                  items={aggregatedSignals.symptoms}
                  emptyText="No symptoms captured yet."
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div
            className={styles.sectionTitle}
          >{`Commands (${aggregatedCommands.length})`}</div>
          {topicCasesQuery.isLoading ? (
            <p className={styles.smallMutedText}>Loading Cases…</p>
          ) : topicCasesQuery.isError ? (
            <p className={styles.errorText}>
              Couldn’t aggregate commands for this Topic.
            </p>
          ) : (
            <CommandList commands={aggregatedCommands} />
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
          ) : recentCases.length === 0 ? (
            <p className={styles.smallMutedText}>
              No Cases under this Topic yet.
            </p>
          ) : (
            <div className={styles.recentCasesList}>
              {recentCases.map((caseItem) => (
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
