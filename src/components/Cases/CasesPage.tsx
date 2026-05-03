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

import {
  type CasePublic,
  type CasesPublic,
  readCase,
  readCases,
  updateCase,
} from "@/api/cases"
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
import { Textarea } from "@/components/ui/textarea"
import { useAutoLoadMore } from "@/hooks/useAutoLoadMore"
import useCustomToast from "@/hooks/useCustomToast"
import { useIsMobile } from "@/hooks/useMobile"
import { getClippedTextDisplay, getSignalChipDisplay } from "@/lib/display"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import styles from "./CasesPage.module.css"

const CASES_PAGE_SIZE = 25
const JIRA_BROWSE_BASE_URL = "https://alexlee4190.atlassian.net/browse"
const GITHUB_PR_SEARCH_BASE_URL = "https://github.com/search"

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

function replaceCaseInPages(
  current: InfiniteData<CasesPublic> | undefined,
  updatedCase: CasePublic,
): InfiniteData<CasesPublic> | undefined {
  if (!current) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.map((caseItem) =>
        caseItem.id === updatedCase.id ? updatedCase : caseItem,
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

function resolveChangeRefUrl(ref: string): string | null {
  const normalized = ref.trim()

  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^KAN-\d+$/i.test(normalized)) {
    return `${JIRA_BROWSE_BASE_URL}/${normalized.toUpperCase()}`
  }
  if (/^PR-\d+$/i.test(normalized)) {
    return `${GITHUB_PR_SEARCH_BASE_URL}?q=${encodeURIComponent(`is:pr ${normalized.toUpperCase()}`)}&type=pullrequests`
  }

  return null
}

function ChipList({
  items,
  emptyText,
  resolveUrl,
}: {
  items: string[]
  emptyText: string
  resolveUrl?: (item: string) => string | null
}) {
  if (items.length === 0) {
    return <p className={styles.smallMutedText}>{emptyText}</p>
  }

  return (
    <div className={styles.chipList}>
      {items.map((item, index) => {
        const display = getSignalChipDisplay(item)
        const url = resolveUrl?.(item) ?? null

        if (url) {
          return (
            <Badge
              key={`${item}-${index}`}
              asChild
              variant="outline"
              className={cn(styles.chip, "normal-case")}
              title={display.title}
            >
              <a href={url} target="_blank" rel="noreferrer">
                <span className={styles.chipLabel}>{display.label}</span>
              </a>
            </Badge>
          )
        }

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

function hypothesisVariant(
  status: CasePublic["hypotheses"][number]["status"],
): "default" | "secondary" | "success" | "destructive" | "outline" {
  if (status === "supported") return "success"
  if (status === "disproven") return "destructive"
  if (status === "open") return "secondary"
  return "outline"
}

function changeVariant(
  kind: CasePublic["changes"][number]["kind"] | undefined,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  switch (kind) {
    case "code":
      return "default"
    case "docs":
      return "secondary"
    case "test":
      return "success"
    case "infra":
      return "destructive"
    default:
      return "outline"
  }
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

function HypothesisList({
  hypotheses,
}: {
  hypotheses: CasePublic["hypotheses"]
}) {
  if (hypotheses.length === 0) {
    return <p className={styles.smallMutedText}>No hypotheses recorded yet.</p>
  }

  return (
    <div className={styles.recordStack}>
      {hypotheses.map((hypothesis, index) => (
        <div
          key={`${hypothesis.statement}-${hypothesis.ts ?? index}`}
          className={styles.recordCard}
        >
          <div className={styles.recordHeader}>
            <div className={styles.recordTitle}>{hypothesis.statement}</div>
            <Badge variant={hypothesisVariant(hypothesis.status)}>
              {hypothesis.status}
            </Badge>
          </div>
          {hypothesis.evidence ? (
            <p className={styles.metaStack}>{hypothesis.evidence}</p>
          ) : null}
          {hypothesis.ts ? (
            <p className={styles.timestampText}>
              {formatTimestamp(hypothesis.ts)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ChangeList({ changes }: { changes: CasePublic["changes"] }) {
  if (changes.length === 0) {
    return <p className={styles.smallMutedText}>No changes recorded yet.</p>
  }

  return (
    <div className={styles.recordStack}>
      {changes.map((change, index) => (
        <div
          key={`${change.summary}-${change.ts ?? index}`}
          className={styles.recordCard}
        >
          <div className={styles.recordHeader}>
            <Badge variant={changeVariant(change.kind)}>{change.kind}</Badge>
            <div className={styles.recordTitle}>{change.summary}</div>
          </div>
          {change.files.length ? (
            <div className={styles.subsection}>
              <div className={styles.subsectionTitle}>Files</div>
              <ChipList
                items={change.files}
                emptyText="No files captured for this change."
              />
            </div>
          ) : null}
          {change.refs.length ? (
            <div className={styles.subsection}>
              <div className={styles.subsectionTitle}>Refs</div>
              <ChipList
                items={change.refs}
                emptyText="No refs captured for this change."
                resolveUrl={resolveChangeRefUrl}
              />
            </div>
          ) : null}
          {change.ts ? (
            <p className={styles.timestampText}>{formatTimestamp(change.ts)}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ContextPackSection({
  snapshot,
}: {
  snapshot: CasePublic["context_pack_snapshot"]
}) {
  const hasRelevantCases = snapshot.relevant_cases.length > 0
  const hasBriefing =
    Boolean(snapshot.topic_summary) ||
    snapshot.matched_signals.length > 0 ||
    snapshot.canonical_files.length > 0 ||
    snapshot.canonical_symbols.length > 0 ||
    snapshot.canonical_errors.length > 0 ||
    snapshot.canonical_symptoms.length > 0 ||
    snapshot.pinned_takeaways.length > 0 ||
    snapshot.ambiguities.length > 0 ||
    snapshot.questions.length > 0 ||
    snapshot.negative_history.length > 0 ||
    hasRelevantCases

  return (
    <div className={styles.section} data-testid="case-context-pack">
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>Context Pack</div>
          <p className={styles.sectionIntro}>
            Agent briefing captured when this Case started.
          </p>
        </div>
        <div className={styles.contextMeta}>
          {snapshot.confidence ? (
            <Badge variant="outline" className="capitalize">
              {snapshot.confidence} confidence
            </Badge>
          ) : null}
          {snapshot.builder_version ? (
            <Badge variant="outline">{snapshot.builder_version}</Badge>
          ) : null}
          {snapshot.created_at ? (
            <Badge variant="outline">
              Built {formatTimestamp(snapshot.created_at)}
            </Badge>
          ) : null}
        </div>
      </div>

      {!hasBriefing ? (
        <p className={styles.smallMutedText}>
          No Context Pack briefing was captured for this Case.
        </p>
      ) : (
        <div className={styles.contextPackStack}>
          {snapshot.topic_summary ? (
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Topic briefing</div>
              <p className={styles.mutedText}>{snapshot.topic_summary}</p>
            </div>
          ) : null}

          <div className={styles.contextGrid}>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Matched signals</div>
              <ChipList
                items={snapshot.matched_signals}
                emptyText="No matched signals captured."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Pinned takeaways</div>
              <TextList
                items={snapshot.pinned_takeaways}
                emptyText="No takeaways promoted yet."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Open questions</div>
              <TextList
                items={snapshot.questions}
                emptyText="No open questions captured."
              />
            </div>
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Negative history</div>
              <TextList
                items={snapshot.negative_history}
                emptyText="No avoid-list captured."
              />
            </div>
          </div>

          <div className={styles.contextPanel}>
            <div className={styles.signalTitle}>Likely relevant code</div>
            <div className={styles.signalGroups}>
              <div>
                <div className={styles.subsectionTitle}>Files</div>
                <ChipList
                  items={snapshot.canonical_files}
                  emptyText="No canonical files selected."
                />
              </div>
              <div>
                <div className={styles.subsectionTitle}>Symbols</div>
                <ChipList
                  items={snapshot.canonical_symbols}
                  emptyText="No canonical symbols selected."
                />
              </div>
              <div>
                <div className={styles.subsectionTitle}>Errors</div>
                <ChipList
                  items={snapshot.canonical_errors}
                  emptyText="No canonical errors selected."
                />
              </div>
              <div>
                <div className={styles.subsectionTitle}>Symptoms</div>
                <ChipList
                  items={snapshot.canonical_symptoms}
                  emptyText="No canonical symptoms selected."
                />
              </div>
            </div>
          </div>

          {snapshot.ambiguities.length > 0 ? (
            <div className={styles.contextPanel}>
              <div className={styles.signalTitle}>Ambiguity notes</div>
              <TextList
                items={snapshot.ambiguities}
                emptyText="No ambiguity notes captured."
              />
            </div>
          ) : null}

          <div className={styles.contextPanel}>
            <div
              className={styles.signalTitle}
            >{`Relevant prior Cases (${snapshot.relevant_cases.length})`}</div>
            {!hasRelevantCases ? (
              <p className={styles.smallMutedText}>
                No prior Cases were selected for this briefing.
              </p>
            ) : (
              <div className={styles.relevantCaseStack}>
                {snapshot.relevant_cases.map((relevantCase) => (
                  <div
                    key={relevantCase.case_id}
                    className={styles.relevantCase}
                  >
                    <div className={styles.recordHeader}>
                      <div className={styles.recordTitle}>
                        {relevantCase.title}
                      </div>
                    </div>
                    {relevantCase.why_selected ? (
                      <p className={styles.smallMutedText}>
                        {relevantCase.why_selected}
                      </p>
                    ) : null}
                    {relevantCase.short_summary || relevantCase.outcome ? (
                      <div className={styles.metaStack}>
                        {relevantCase.short_summary ? (
                          <p>{relevantCase.short_summary}</p>
                        ) : null}
                        {relevantCase.outcome ? (
                          <p>{relevantCase.outcome}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className={styles.relevantCaseSignals}>
                      <ChipList
                        items={relevantCase.key_files}
                        emptyText="No files."
                      />
                      <ChipList
                        items={relevantCase.key_symbols}
                        emptyText="No symbols."
                      />
                      <ChipList
                        items={relevantCase.key_errors}
                        emptyText="No errors."
                      />
                    </div>
                    {relevantCase.key_commands.length > 0 ? (
                      <div className={styles.subsection}>
                        <div className={styles.subsectionTitle}>
                          Key commands
                        </div>
                        <TextList
                          items={relevantCase.key_commands}
                          emptyText="No commands."
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CASE_COLUMNS: ColumnDef<CasePublic>[] = [
  {
    accessorKey: "title",
    header: "Case",
    meta: {
      width: "22rem",
      cellClassName: styles.caseCell,
    },
    cell: ({ row }) => {
      const title = getClippedTextDisplay(row.original.title)
      const subtitle = getClippedTextDisplay(
        row.original.summary_current ||
          row.original.input_summary ||
          "No summary yet",
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
    accessorKey: "topic_title",
    header: "Topic",
    meta: {
      width: "14rem",
      cellClassName: styles.topicCell,
    },
    cell: ({ row }) => {
      const topicTitle = getClippedTextDisplay(row.original.topic_title || "—")

      return (
        <span className={styles.tableTopic} title={topicTitle.title}>
          {topicTitle.label}
        </span>
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
    accessorKey: "updated_at",
    header: "Updated",
    meta: {
      width: "12rem",
      cellClassName: styles.updatedCell,
    },
    cell: ({ row }) => formatTimestamp(row.original.updated_at),
  },
]

export function CasesPage({
  initialSelectedCaseId = null,
}: {
  initialSelectedCaseId?: string | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const { isDemoMode } = useDemoMode()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    initialSelectedCaseId,
  )
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const skipTitleBlurRef = useRef(false)
  const skipDescriptionBlurRef = useRef(false)
  const [casesListViewport, setCasesListViewport] =
    useState<HTMLDivElement | null>(null)
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(true)
  const [isFocusedViewOpen, setIsFocusedViewOpen] = useState(false)
  const lastDemoModeRef = useRef(isDemoMode)

  useEffect(() => {
    if (initialSelectedCaseId) {
      setSelectedCaseId(initialSelectedCaseId)
      setIsFocusedViewOpen(false)
    }
  }, [initialSelectedCaseId])

  useEffect(() => {
    if (lastDemoModeRef.current === isDemoMode) return

    lastDemoModeRef.current = isDemoMode
    setSelectedCaseId(null)
    setIsSplitViewOpen(true)
    setIsFocusedViewOpen(false)
    void navigate({
      to: "/cases",
      search: {},
      replace: true,
    })
  }, [isDemoMode, navigate])

  const casesQuery = useInfiniteQuery({
    queryKey: ["cases", isDemoMode],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readCases({
        skip: pageParam,
        limit: CASES_PAGE_SIZE,
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

  const cases = useMemo(
    () => casesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [casesQuery.data],
  )
  const totalCases = casesQuery.data?.pages[0]?.count ?? cases.length

  const selectedCase = useMemo<CasePublic | null>(() => {
    if (!cases.length) return null
    if (selectedCaseId) {
      return cases.find((caseItem) => caseItem.id === selectedCaseId) ?? null
    }
    return cases[0]
  }, [cases, selectedCaseId])

  const resolvedSelectedCaseId = selectedCaseId ?? cases[0]?.id ?? null

  const detailQuery = useQuery({
    enabled: Boolean(resolvedSelectedCaseId),
    queryKey: ["case", resolvedSelectedCaseId, isDemoMode],
    queryFn: () => readCase(resolvedSelectedCaseId ?? "", { demo: isDemoMode }),
  })

  const detail = detailQuery.data ?? selectedCase
  const visibleCases = useMemo(() => {
    if (!detail) return cases
    if (cases.some((caseItem) => caseItem.id === detail.id)) return cases
    return [detail, ...cases]
  }, [cases, detail])
  const files = detail?.files ?? []
  const symbols = detail?.symbols ?? []
  const errors = detail?.errors ?? []
  const symptoms = detail?.symptoms ?? []
  const hasStructuredNotes = Boolean(
    detail?.input_summary ||
      detail?.summary_current ||
      detail?.source ||
      detail?.outcome ||
      detail?.next_steps.length ||
      files.length ||
      symbols.length ||
      errors.length ||
      symptoms.length ||
      detail?.commands.length ||
      detail?.hypotheses.length ||
      detail?.changes.length,
  )

  const updateCaseMutation = useMutation({
    mutationFn: ({
      caseId,
      title,
      summaryCurrent,
    }: {
      caseId: string
      title?: string
      summaryCurrent?: string | null
    }) =>
      updateCase(
        caseId,
        {
          title,
          summary_current: summaryCurrent,
        },
        { demo: isDemoMode },
      ),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData<InfiniteData<CasesPublic> | undefined>(
        ["cases", isDemoMode],
        (current) => replaceCaseInPages(current, updatedCase),
      )
      queryClient.setQueryData(
        ["case", updatedCase.id, isDemoMode],
        updatedCase,
      )
    },
    onError: handleError.bind(showErrorToast),
  })

  const cancelTitleEdit = () => {
    skipTitleBlurRef.current = false
    setIsEditingTitle(false)
    setTitleDraft(detail?.title ?? "")
  }

  const cancelDescriptionEdit = () => {
    skipDescriptionBlurRef.current = false
    setIsEditingDescription(false)
    setDescriptionDraft(detail?.summary_current ?? "")
  }

  const startTitleEdit = () => {
    skipTitleBlurRef.current = false
    setTitleDraft(detail?.title ?? "")
    setIsEditingTitle(true)
  }

  const startDescriptionEdit = () => {
    skipDescriptionBlurRef.current = false
    setDescriptionDraft(detail?.summary_current ?? "")
    setIsEditingDescription(true)
  }

  const saveTitle = async () => {
    if (!detail?.id) return

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      showErrorToast("Case title can't be empty.")
      return
    }

    if (nextTitle === detail.title.trim()) {
      cancelTitleEdit()
      return
    }

    try {
      await updateCaseMutation.mutateAsync({
        caseId: detail.id,
        title: nextTitle,
      })
      setIsEditingTitle(false)
      showSuccessToast("Case title updated")
    } catch {
      return
    }
  }

  const saveDescription = async () => {
    if (!detail?.id) return

    const nextDescription = descriptionDraft.trim()
    const currentDescription = detail.summary_current?.trim() ?? ""
    if (nextDescription === currentDescription) {
      cancelDescriptionEdit()
      return
    }

    try {
      await updateCaseMutation.mutateAsync({
        caseId: detail.id,
        summaryCurrent: nextDescription || null,
      })
      setIsEditingDescription(false)
      showSuccessToast(
        nextDescription
          ? "Case description updated"
          : "Case description cleared",
      )
    } catch {
      return
    }
  }

  const casesLoadMoreRef = useAutoLoadMore<HTMLDivElement>({
    enabled: !casesQuery.isLoading,
    hasMore: casesQuery.hasNextPage,
    isLoadingMore: casesQuery.isFetchingNextPage,
    onLoadMore: () => {
      if (!casesQuery.hasNextPage || casesQuery.isFetchingNextPage) return
      void casesQuery.fetchNextPage()
    },
    root: isMobile ? null : casesListViewport,
  })

  const renderCaseDetailCard = (focused: boolean) => {
    if (!detail) {
      return (
        <Card className={cn(focused ? styles.focusedCard : styles.splitCard)}>
          <CardHeader>
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderMain}>
                <CardTitle>Loading Case…</CardTitle>
                <CardDescription>
                  Fetching the selected case detail from the canonical API.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className={styles.shrinkButton}
                aria-label={
                  focused ? "Exit focused case view" : "Open focused case view"
                }
                data-testid="case-focus-toggle"
                disabled
              >
                {focused ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </div>
          </CardHeader>
          <CardContent
            className={cn(
              styles.loadingCardContent,
              focused ? styles.detailContentFocused : styles.detailContentSplit,
            )}
          >
            Case details will appear here once loading completes.
          </CardContent>
        </Card>
      )
    }

    return (
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
                      disabled={updateCaseMutation.isPending}
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
                    title="Click to rename case title"
                    onClick={startTitleEdit}
                  >
                    {detail.title ?? "Untitled case"}
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
                      disabled={updateCaseMutation.isPending}
                      placeholder="No description captured for this case yet."
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
                    title="Click to rename case description"
                    onClick={startDescriptionEdit}
                  >
                    {detail.summary_current ? (
                      detail.summary_current
                    ) : (
                      <span className={styles.emptyDescription}>
                        No description captured for this case yet.
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
                  focused ? "Exit focused case view" : "Open focused case view"
                }
                data-testid="case-focus-toggle"
                onClick={() => setIsFocusedViewOpen((open) => !open)}
              >
                {focused ? <Minimize2 /> : <Maximize2 />}
              </Button>

              {!focused ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Close split case view"
                  data-testid="case-split-close"
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
            <Badge variant={badgeVariant(detail.status ?? "open")}>
              {detail.status ?? "open"}
            </Badge>
            <Badge variant="outline">
              {detail.topic_title || "Unassigned Topic"}
            </Badge>
            <Badge variant="outline">
              Opened {formatTimestamp(detail.opened_at ?? null)}
            </Badge>
            <Badge variant="outline">
              Updated {formatTimestamp(detail.updated_at ?? null)}
            </Badge>
            {detail.closed_at ? (
              <Badge variant="outline">
                Closed {formatTimestamp(detail.closed_at)}
              </Badge>
            ) : null}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Notes</div>
            {!hasStructuredNotes ? (
              <p className={styles.smallMutedText}>
                No case notes recorded for this Case yet.
              </p>
            ) : (
              <div className={styles.notesContent}>
                <div>
                  <div className={styles.sectionTitle}>Request</div>
                  <p className={styles.mutedText}>
                    {detail.input_summary || "No request summary captured yet."}
                  </p>
                </div>
                <div>
                  <div className={styles.sectionTitle}>Current summary</div>
                  <p className={styles.mutedText}>
                    {detail.summary_current || "No running summary yet."}
                  </p>
                </div>
                <div>
                  <div className={styles.sectionTitle}>Source</div>
                  <p className={styles.mutedText}>{detail.source || "—"}</p>
                </div>
                {detail.outcome ? (
                  <div>
                    <div className={styles.sectionTitle}>Outcome</div>
                    <p className={styles.mutedText}>{detail.outcome}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <ContextPackSection snapshot={detail.context_pack_snapshot} />

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Signals</div>
            <div className={styles.signalGroups}>
              <div>
                <div className={styles.signalTitle}>Files</div>
                <ChipList items={files} emptyText="No files captured yet." />
              </div>
              <div>
                <div className={styles.signalTitle}>Symbols</div>
                <ChipList
                  items={symbols}
                  emptyText="No symbols captured yet."
                />
              </div>
              <div>
                <div className={styles.signalTitle}>Errors</div>
                <ChipList items={errors} emptyText="No errors captured yet." />
              </div>
              <div>
                <div className={styles.signalTitle}>Symptoms</div>
                <ChipList
                  items={symptoms}
                  emptyText="No symptoms captured yet."
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div
              className={styles.sectionTitle}
            >{`Commands (${detail.commands.length})`}</div>
            <CommandList commands={detail.commands} />
          </div>

          <div className={styles.section}>
            <div
              className={styles.sectionTitle}
            >{`Hypotheses (${detail.hypotheses.length})`}</div>
            <HypothesisList hypotheses={detail.hypotheses} />
          </div>

          <div className={styles.section}>
            <div
              className={styles.sectionTitle}
            >{`Changes (${detail.changes.length})`}</div>
            <ChangeList changes={detail.changes} />
          </div>

          <div className={styles.section}>
            <div
              className={styles.sectionTitle}
            >{`Next steps (${detail.next_steps.length})`}</div>
            {detail.next_steps.length ? (
              <div className={styles.nextStepsList}>
                {detail.next_steps.map((step) => (
                  <p key={step}>• {step}</p>
                ))}
              </div>
            ) : (
              <p className={styles.smallMutedText}>
                No next steps recorded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isLoadingCases =
    casesQuery.isLoading ||
    (Boolean(resolvedSelectedCaseId) &&
      detailQuery.isLoading &&
      visibleCases.length === 0)

  return (
    <div className={styles.page}>
      {isLoadingCases ? (
        <Card>
          <CardContent className={styles.statusCardContent}>
            Loading Cases…
          </CardContent>
        </Card>
      ) : casesQuery.isError ? (
        <Card>
          <CardContent className={styles.errorCardContent}>
            Couldn’t load Cases.
          </CardContent>
        </Card>
      ) : visibleCases.length === 0 ? (
        <Card>
          <CardContent className={styles.statusCardContent}>
            No Cases yet.
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
              data-testid="cases-primary-pane"
              className={styles.primaryPane}
            >
              <CardHeader>
                <CardTitle>Cases</CardTitle>
                <CardDescription>
                  {describeLoadedCount(
                    visibleCases.length,
                    totalCases,
                    "case",
                    "cases",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className={styles.primaryContent}>
                <div className={styles.primaryTableWrap}>
                  <SplitDataTable
                    columns={CASE_COLUMNS}
                    data={visibleCases}
                    getRowId={(caseItem) => caseItem.id}
                    selectedRowId={detail?.id ?? null}
                    viewportRef={setCasesListViewport}
                    loadMoreRef={casesLoadMoreRef}
                    hasMore={casesQuery.hasNextPage}
                    getRowClassName={() => "group"}
                    onRowClick={(caseItem) => {
                      setSelectedCaseId(caseItem.id)
                      setIsSplitViewOpen(true)
                      setIsFocusedViewOpen(false)
                      void navigate({
                        to: "/cases",
                        search: { caseId: caseItem.id },
                      })
                    }}
                  />
                </div>

                {casesQuery.isFetchingNextPage ? (
                  <p className={styles.loadMoreText}>Loading more Cases…</p>
                ) : null}
              </CardContent>
            </Card>

            {isSplitViewOpen ? renderCaseDetailCard(false) : null}
          </div>

          <Dialog open={isFocusedViewOpen} onOpenChange={setIsFocusedViewOpen}>
            <DialogContent
              showCloseButton={false}
              className={styles.dialogContent}
            >
              {renderCaseDetailCard(true)}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
