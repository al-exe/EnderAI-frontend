import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Maximize2, Minimize2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  type CasePublic,
  type CasesPublic,
  readCase,
  readCases,
  updateCase,
} from "@/api/cases"
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

const CASES_PAGE_SIZE = 25

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
  const signals = [
    ...(detail?.files ?? []),
    ...(detail?.errors ?? []),
    ...(detail?.symptoms ?? []),
  ]

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
              ? "flex h-full flex-col rounded-none border-0 shadow-none"
              : "lg:flex lg:min-h-0 lg:flex-col",
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
              "text-sm text-muted-foreground",
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
            ? "flex h-full flex-col rounded-none border-0 shadow-none"
            : "lg:flex lg:min-h-0 lg:flex-col",
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
          </div>
        </CardHeader>

        <CardContent
          className={cn(
            "space-y-6",
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

          <div className="space-y-2 text-sm">
            <div>
              <div className="font-medium">Request</div>
              <p className="text-muted-foreground">
                {detail.input_summary || "No request summary captured yet."}
              </p>
            </div>
            <div>
              <div className="font-medium">Source</div>
              <p className="text-muted-foreground">{detail.source || "—"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">Signals</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {signals.slice(0, 8).map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
              {signals.length === 0 ? (
                <span className="text-muted-foreground">
                  No signals recorded yet.
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">Notes</div>
            {(detail.next_steps.length ?? 0) === 0 && !detail.outcome ? (
              <p className="text-sm text-muted-foreground">
                No contextual notes recorded for this Case yet.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                {detail.outcome ? <p>{detail.outcome}</p> : null}
                {detail.next_steps.map((step) => (
                  <p key={step}>• {step}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
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
          <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card className="lg:flex lg:min-h-0 lg:flex-col">
              <CardHeader>
                <CardTitle>All Cases</CardTitle>
                <CardDescription>
                  {describeLoadedCount(
                    cases.length,
                    totalCases,
                    "case record",
                    "case records",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                <div
                  ref={setCasesListViewport}
                  className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                >
                  <Table>
                    <TableHeader className="lg:sticky lg:top-0 lg:z-10">
                      <TableRow>
                        <TableHead>Case</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((caseItem) => {
                        const selected = detail?.id === caseItem.id
                        return (
                          <TableRow
                            key={caseItem.id}
                            className={cn(
                              "cursor-pointer",
                              selected ? "bg-muted/50" : undefined,
                            )}
                            onClick={() => {
                              setSelectedCaseId(caseItem.id)
                              setIsFocusedViewOpen(false)
                            }}
                          >
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-1">
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
                            <TableCell>{caseItem.topic_title || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={badgeVariant(caseItem.status)}>
                                {caseItem.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatTimestamp(caseItem.updated_at)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {casesQuery.hasNextPage ? (
                    <div ref={casesLoadMoreRef} className="h-4" />
                  ) : null}
                </div>

                {casesQuery.isFetchingNextPage ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading more Cases…
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {renderCaseDetailCard(false)}
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
