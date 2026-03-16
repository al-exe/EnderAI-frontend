import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { readCase, readCases, type CasePublic } from "@/api/cases"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

export function CasesPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

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
              <CardTitle>{detail?.title}</CardTitle>
              <CardDescription>{detail?.topic_title || "Unassigned Topic"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={badgeVariant(detail?.status ?? "open")}>{detail?.status ?? "open"}</Badge>
                <Badge variant="outline">Opened {formatTimestamp(detail?.opened_at ?? null)}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <div className="font-medium">Current summary</div>
                  <p className="text-muted-foreground">
                    {detail?.summary_current || detail?.input_summary || "No summary yet."}
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
                  {[
                    ...(detail?.files ?? []),
                    ...(detail?.errors ?? []),
                    ...(detail?.symptoms ?? []),
                  ]
                    .slice(0, 8)
                    .map((value) => (
                      <Badge key={value} variant="outline">
                        {value}
                      </Badge>
                    ))}
                  {!detail?.files.length && !detail?.errors.length && !detail?.symptoms.length ? (
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
