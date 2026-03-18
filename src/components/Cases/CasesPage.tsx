import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readCase,
  readCases,
  type CasePublic,
  type CasesPublic,
  updateCase,
} from "@/api/cases"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function badgeVariant(status: string): "default" | "secondary" | "success" | "destructive" | "outline" {
  const normalized = status.trim().toLowerCase()
  if (["done", "closed", "resolved"].includes(normalized)) return "success"
  if (["failed", "error", "blocked"].includes(normalized)) return "destructive"
  if (["running", "active", "in progress"].includes(normalized)) return "secondary"
  return "outline"
}

function replaceCaseInList(
  current: CasesPublic | undefined,
  updatedCase: CasePublic,
): CasesPublic | undefined {
  if (!current) return current

  return {
    ...current,
    data: current.data.map((caseItem) =>
      caseItem.id === updatedCase.id ? updatedCase : caseItem,
    ),
  }
}

export function CasesPage({
  initialSelectedCaseId = null,
}: {
  initialSelectedCaseId?: string | null
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    initialSelectedCaseId,
  )
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState("")

  useEffect(() => {
    if (initialSelectedCaseId) {
      setSelectedCaseId(initialSelectedCaseId)
    }
  }, [initialSelectedCaseId])

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: () => readCases({ limit: 100 }),
  })

  const cases = casesQuery.data?.data ?? []
  const selectedCase = useMemo<CasePublic | null>(() => {
    if (!cases.length) return null
    return cases.find((caseItem) => caseItem.id === selectedCaseId) ?? cases[0]
  }, [selectedCaseId, cases])

  const detailQuery = useQuery({
    enabled: Boolean(selectedCase?.id),
    queryKey: ["case", selectedCase?.id],
    queryFn: () => readCase(selectedCase?.id ?? ""),
  })

  const detail = detailQuery.data ?? selectedCase
  const signals = [
    ...(detail?.files ?? []),
    ...(detail?.errors ?? []),
    ...(detail?.symptoms ?? []),
  ]

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(detail?.title ?? "")
    }
  }, [detail?.id, detail?.title, isEditingTitle])

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionDraft(detail?.summary_current ?? "")
    }
  }, [detail?.id, detail?.summary_current, isEditingDescription])

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
      queryClient.setQueryData<CasesPublic | undefined>(["cases"], (current) =>
        replaceCaseInList(current, updatedCase),
      )
      queryClient.setQueryData(["case", updatedCase.id], updatedCase)
    },
    onError: handleError.bind(showErrorToast),
  })

  const cancelTitleEdit = () => {
    setIsEditingTitle(false)
    setTitleDraft(detail?.title ?? "")
  }

  const cancelDescriptionEdit = () => {
    setIsEditingDescription(false)
    setDescriptionDraft(detail?.summary_current ?? "")
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
        nextDescription ? "Case description updated" : "Case description cleared",
      )
    } catch {
      return
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
        <p className="text-muted-foreground">
          Bounded execution records attached to Topics under the canonical model.
        </p>
      </div>

      {casesQuery.isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading Cases…</CardContent>
        </Card>
      ) : casesQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">Couldn’t load Cases.</CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No Cases yet. Cases will appear here once Topic work starts flowing through the canonical model.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>All Cases</CardTitle>
              <CardDescription>{cases.length} case records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((caseItem) => {
                    const selected = selectedCase?.id === caseItem.id
                    return (
                      <TableRow
                        key={caseItem.id}
                        className={selected ? "bg-muted/50" : undefined}
                        onClick={() => setSelectedCaseId(caseItem.id)}
                      >
                        <TableCell className="cursor-pointer">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{caseItem.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {caseItem.summary_current || caseItem.input_summary || "No summary yet"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{caseItem.topic_title || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(caseItem.status)}>{caseItem.status}</Badge>
                        </TableCell>
                        <TableCell>{formatTimestamp(caseItem.updated_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
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
                          cancelTitleEdit()
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={updateCaseMutation.isPending}
                        onClick={() => {
                          void saveTitle()
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateCaseMutation.isPending}
                        onClick={cancelTitleEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-fit max-w-full cursor-text text-left underline-offset-4 hover:underline"
                    title="Click to rename case title"
                    onClick={() => {
                      setTitleDraft(detail?.title ?? "")
                      setIsEditingTitle(true)
                    }}
                  >
                    {detail?.title ?? "Untitled case"}
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
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault()
                          void saveDescription()
                        }

                        if (e.key === "Escape") {
                          e.preventDefault()
                          cancelDescriptionEdit()
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={updateCaseMutation.isPending}
                        onClick={() => {
                          void saveDescription()
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateCaseMutation.isPending}
                        onClick={cancelDescriptionEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full cursor-text text-left underline-offset-4 hover:underline"
                    title="Click to rename case description"
                    onClick={() => {
                      setDescriptionDraft(detail?.summary_current ?? "")
                      setIsEditingDescription(true)
                    }}
                  >
                    {detail?.summary_current ? (
                      detail.summary_current
                    ) : (
                      <span className="italic">No description captured for this case yet.</span>
                    )}
                  </button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={badgeVariant(detail?.status ?? "open")}>{detail?.status ?? "open"}</Badge>
                <Badge variant="outline">{detail?.topic_title || "Unassigned Topic"}</Badge>
                <Badge variant="outline">Opened {formatTimestamp(detail?.opened_at ?? null)}</Badge>
                <Badge variant="outline">Updated {formatTimestamp(detail?.updated_at ?? null)}</Badge>
                {detail?.closed_at ? (
                  <Badge variant="outline">Closed {formatTimestamp(detail.closed_at)}</Badge>
                ) : null}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <div className="font-medium">Request</div>
                  <p className="text-muted-foreground">
                    {detail?.input_summary || "No request summary captured yet."}
                  </p>
                </div>
                <div>
                  <div className="font-medium">Source</div>
                  <p className="text-muted-foreground">{detail?.source || "—"}</p>
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
                    <span className="text-muted-foreground">No signals recorded yet.</span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-medium">Notes</div>
                {(detail?.next_steps.length ?? 0) === 0 && !detail?.outcome ? (
                  <p className="text-sm text-muted-foreground">No contextual notes recorded for this Case yet.</p>
                ) : (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {detail?.outcome ? <p>{detail.outcome}</p> : null}
                    {detail?.next_steps.map((step) => (
                      <p key={step}>• {step}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
