import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Maximize2, Minimize2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  type CasePublic,
  type CasesPublic,
  readCase,
  readCases,
  updateCase,
} from "@/api/cases"
import { SplitScrollableTable } from "@/components/Common/SplitScrollableTable"
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

const CASES_PAGE_SIZE = 25
const CASES_COLUMN_WIDTHS = ["22rem", "14rem", "8rem", "12rem"] as const

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

function ChipList({
  items,
  emptyText,
}: {
  items: string[]
  emptyText: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
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
    return (
      <p className="text-sm text-muted-foreground">No commands captured yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {commands.map((command, index) => (
        <div
          key={`${command.cmd}-${command.ts ?? index}`}
          className="rounded-lg border p-3"
        >
          <div className="font-mono text-xs">{command.cmd}</div>
          {command.purpose || command.salient_result || command.ts ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
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
    return (
      <p className="text-sm text-muted-foreground">
        No hypotheses recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {hypotheses.map((hypothesis, index) => (
        <div
          key={`${hypothesis.statement}-${hypothesis.ts ?? index}`}
          className="rounded-lg border p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{hypothesis.statement}</div>
            <Badge variant={hypothesisVariant(hypothesis.status)}>
              {hypothesis.status}
            </Badge>
          </div>
          {hypothesis.evidence ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {hypothesis.evidence}
            </p>
          ) : null}
          {hypothesis.ts ? (
            <p className="mt-2 text-xs text-muted-foreground">
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
    return (
      <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <div
          key={`${change.summary}-${change.ts ?? index}`}
          className="rounded-lg border p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={changeVariant(change.kind)}>{change.kind}</Badge>
            <div className="font-medium">{change.summary}</div>
          </div>
          {change.files.length ? (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Files
              </div>
              <ChipList
                items={change.files}
                emptyText="No files captured for this change."
              />
            </div>
          ) : null}
          {change.refs.length ? (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Refs
              </div>
              <ChipList
                items={change.refs}
                emptyText="No refs captured for this change."
              />
            </div>
          ) : null}
          {change.ts ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {formatTimestamp(change.ts)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function CasesPage({
  initialSelectedCaseId = null,
}: {
  initialSelectedCaseId?: string | null
}) {
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
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

  useEffect(() => {
    if (initialSelectedCaseId) {
      setSelectedCaseId(initialSelectedCaseId)
      setIsFocusedViewOpen(false)
    }
  }, [initialSelectedCaseId])

  const casesQuery = useInfiniteQuery({
    queryKey: ["cases"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readCases({
        skip: pageParam,
        limit: CASES_PAGE_SIZE,
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
    queryKey: ["case", resolvedSelectedCaseId],
    queryFn: () => readCase(resolvedSelectedCaseId ?? ""),
  })

  const detail = detailQuery.data ?? selectedCase
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
      updateCase(caseId, {
        title,
        summary_current: summaryCurrent,
      }),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData<InfiniteData<CasesPublic> | undefined>(
        ["cases"],
        (current) => replaceCaseInPages(current, updatedCase),
      )
      queryClient.setQueryData(["case", updatedCase.id], updatedCase)
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
        <Card
          className={cn(
            focused
              ? "flex h-full min-w-0 flex-col rounded-none border-0 shadow-none"
              : "lg:flex lg:min-h-0 lg:min-w-0 lg:max-h-full lg:flex-col lg:overflow-hidden",
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle>Loading Case…</CardTitle>
                <CardDescription>
                  Fetching the selected case detail from the canonical API.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
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
              "overflow-x-hidden text-sm text-muted-foreground",
              focused
                ? "min-h-0 flex-1 overflow-y-auto"
                : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
            )}
          >
            Case details will appear here once loading completes.
          </CardContent>
        </Card>
      )
    }

    return (
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
                    <div className="text-xs text-muted-foreground">
                      Enter to save • Esc to cancel
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-fit max-w-full cursor-text text-left underline-offset-4 hover:underline"
                    title="Click to rename case title"
                    onClick={startTitleEdit}
                  >
                    {detail.title ?? "Untitled case"}
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
                    <div className="text-xs text-muted-foreground">
                      Enter to save • Shift+Enter for newline • Esc to cancel
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full cursor-text text-left underline-offset-4 hover:underline"
                    title="Click to rename case description"
                    onClick={startDescriptionEdit}
                  >
                    {detail.summary_current ? (
                      detail.summary_current
                    ) : (
                      <span className="italic">
                        No description captured for this case yet.
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
            "space-y-6 overflow-x-hidden",
            focused
              ? "min-h-0 flex-1 overflow-y-auto"
              : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
          )}
        >
          <div className="flex flex-wrap gap-2">
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

          <div className="space-y-3">
            <div className="font-medium">Notes</div>
            {!hasStructuredNotes ? (
              <p className="text-sm text-muted-foreground">
                No case notes recorded for this Case yet.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">Request</div>
                  <p className="text-muted-foreground">
                    {detail.input_summary || "No request summary captured yet."}
                  </p>
                </div>
                <div>
                  <div className="font-medium">Current summary</div>
                  <p className="text-muted-foreground">
                    {detail.summary_current || "No running summary yet."}
                  </p>
                </div>
                <div>
                  <div className="font-medium">Source</div>
                  <p className="text-muted-foreground">
                    {detail.source || "—"}
                  </p>
                </div>
                {detail.outcome ? (
                  <div>
                    <div className="font-medium">Outcome</div>
                    <p className="text-muted-foreground">{detail.outcome}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-medium">Signals</div>
            <div className="space-y-3">
              <div>
                <div className="mb-2 text-sm font-medium">Files</div>
                <ChipList items={files} emptyText="No files captured yet." />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Symbols</div>
                <ChipList
                  items={symbols}
                  emptyText="No symbols captured yet."
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Errors</div>
                <ChipList items={errors} emptyText="No errors captured yet." />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Symptoms</div>
                <ChipList
                  items={symptoms}
                  emptyText="No symptoms captured yet."
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">{`Commands (${detail.commands.length})`}</div>
            <CommandList commands={detail.commands} />
          </div>

          <div className="space-y-3">
            <div className="font-medium">{`Hypotheses (${detail.hypotheses.length})`}</div>
            <HypothesisList hypotheses={detail.hypotheses} />
          </div>

          <div className="space-y-3">
            <div className="font-medium">{`Changes (${detail.changes.length})`}</div>
            <ChangeList changes={detail.changes} />
          </div>

          <div className="space-y-3">
            <div className="font-medium">{`Next steps (${detail.next_steps.length})`}</div>
            {detail.next_steps.length ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {detail.next_steps.map((step) => (
                  <p key={step}>• {step}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No next steps recorded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      {casesQuery.isLoading ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Loading Cases…
          </CardContent>
        </Card>
      ) : casesQuery.isError ? (
        <Card>
          <CardContent className="text-sm text-destructive">
            Couldn’t load Cases.
          </CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No Cases yet. Cases will appear here once Topic work starts flowing
            through the canonical model.
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
                <CardTitle>Cases</CardTitle>
                <CardDescription>
                  {describeLoadedCount(
                    cases.length,
                    totalCases,
                    "case",
                    "cases",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                  <SplitScrollableTable
                    viewportRef={setCasesListViewport}
                    header={
                      <table className="w-max min-w-full caption-bottom text-sm">
                        <colgroup>
                          {CASES_COLUMN_WIDTHS.map((width) => (
                            <col key={width} style={{ width }} />
                          ))}
                        </colgroup>
                        <TableHeader>
                          <TableRow className="border-b-0">
                            <TableHead>Case</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                      </table>
                    }
                    body={
                      <>
                        <table className="w-max min-w-full caption-bottom text-sm">
                          <colgroup>
                            {CASES_COLUMN_WIDTHS.map((width) => (
                              <col key={width} style={{ width }} />
                            ))}
                          </colgroup>
                          <TableBody>
                            {cases.map((caseItem) => {
                              const selected = detail?.id === caseItem.id
                              return (
                                <TableRow
                                  key={caseItem.id}
                                  className={cn(
                                    "group cursor-pointer",
                                    selected ? "bg-muted/50" : undefined,
                                  )}
                                  onClick={() => {
                                    setSelectedCaseId(caseItem.id)
                                    setIsSplitViewOpen(true)
                                    setIsFocusedViewOpen(false)
                                  }}
                                >
                                  <TableCell className="align-top py-2">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-medium">
                                        {caseItem.title}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {caseItem.summary_current ||
                                          caseItem.input_summary ||
                                          "No summary yet"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <span>{caseItem.topic_title || "—"}</span>
                                  </TableCell>
                                  <TableCell className="py-2 whitespace-nowrap">
                                    <Badge
                                      variant={badgeVariant(caseItem.status)}
                                    >
                                      {caseItem.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2 whitespace-nowrap">
                                    {formatTimestamp(caseItem.updated_at)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </table>
                        {casesQuery.hasNextPage ? (
                          <div ref={casesLoadMoreRef} className="h-4" />
                        ) : null}
                      </>
                    }
                  />
                </div>

                {casesQuery.isFetchingNextPage ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading more Cases…
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {isSplitViewOpen ? renderCaseDetailCard(false) : null}
          </div>

          <Dialog open={isFocusedViewOpen} onOpenChange={setIsFocusedViewOpen}>
            <DialogContent
              showCloseButton={false}
              className="flex h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] flex-col overflow-hidden p-0"
            >
              {renderCaseDetailCard(true)}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
