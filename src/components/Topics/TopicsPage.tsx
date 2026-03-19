import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

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

function replaceTopicInList(
  current: TopicsPublic | undefined,
  updatedTopic: TopicPublic,
): TopicsPublic | undefined {
  if (!current) return current

  return {
    ...current,
    data: current.data.map((topic) =>
      topic.id === updatedTopic.id ? updatedTopic : topic,
    ),
  }
}

export function TopicsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState("")

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: () => readTopics({ limit: 100 }),
  })

  const topics = topicsQuery.data?.data ?? []
  const selectedTopic = useMemo<TopicPublic | null>(() => {
    if (!topics.length) return null
    return topics.find((topic) => topic.id === selectedTopicId) ?? topics[0]
  }, [selectedTopicId, topics])

  const topicCasesQuery = useQuery({
    enabled: Boolean(selectedTopic?.id),
    queryKey: ["topicCases", selectedTopic?.id],
    queryFn: () => readCases({ topic_id: selectedTopic?.id ?? undefined, limit: 20 }),
  })

  const topicRollupQuery = useQuery({
    enabled: Boolean(selectedTopic?.id),
    queryKey: ["topicRollup", selectedTopic?.id],
    queryFn: () => readTopicRollup(selectedTopic?.id ?? ""),
  })

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(selectedTopic?.title ?? "")
    }
  }, [isEditingTitle, selectedTopic?.id, selectedTopic?.title])

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionDraft(selectedTopic?.description ?? "")
    }
  }, [isEditingDescription, selectedTopic?.description, selectedTopic?.id])

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
      queryClient.setQueryData<TopicsPublic | undefined>(["topics"], (current) =>
        replaceTopicInList(current, updatedTopic),
      )
      queryClient.invalidateQueries({
        queryKey: ["topicRollup", updatedTopic.id],
      })
    },
    onError: handleError.bind(showErrorToast),
  })

  const cancelTitleEdit = () => {
    setIsEditingTitle(false)
    setTitleDraft(selectedTopic?.title ?? "")
  }

  const cancelDescriptionEdit = () => {
    setIsEditingDescription(false)
    setDescriptionDraft(selectedTopic?.description ?? "")
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
        nextDescription ? "Topic description updated" : "Topic description cleared",
      )
    } catch {
      return
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Canonical workstreams backed only by the Topic / Case / ContextPack model.
        </p>
      </div>

      {topicsQuery.isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading Topics…
          </CardContent>
        </Card>
      ) : topicsQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            Couldn’t load Topics.
          </CardContent>
        </Card>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No Topics yet. Topics will appear here as cases are created under the new canonical model.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>All Topics</CardTitle>
              <CardDescription>{topics.length} active topic records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                        className={selected ? "bg-muted/50" : undefined}
                        onClick={() => setSelectedTopicId(topic.id)}
                      >
                        <TableCell className="cursor-pointer">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{topic.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {topic.workflow_key}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(topic.status)}>{topic.status}</Badge>
                        </TableCell>
                        <TableCell>{topic.case_count}</TableCell>
                        <TableCell>{formatTimestamp(topic.last_used_at)}</TableCell>
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
                      disabled={updateTopicMutation.isPending}
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
                        disabled={updateTopicMutation.isPending}
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
                        disabled={updateTopicMutation.isPending}
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
                    title="Click to rename topic title"
                    onClick={() => {
                      setTitleDraft(selectedTopic?.title ?? "")
                      setIsEditingTitle(true)
                    }}
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
                        disabled={updateTopicMutation.isPending}
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
                        disabled={updateTopicMutation.isPending}
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
                    title="Click to rename topic description"
                    onClick={() => {
                      setDescriptionDraft(selectedTopic?.description ?? "")
                      setIsEditingDescription(true)
                    }}
                  >
                    {selectedTopic?.description ? (
                      selectedTopic.description
                    ) : (
                      <span className="italic">No description captured for this topic yet.</span>
                    )}
                  </button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={badgeVariant(selectedTopic?.status ?? "open")}>
                  {selectedTopic?.status ?? "open"}
                </Badge>
                <Badge variant="outline">{selectedTopic?.workflow_key}</Badge>
                <Badge variant="outline">{selectedTopic?.case_count ?? 0} cases</Badge>
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
                  <p className="text-sm text-destructive">Couldn’t load the Topic rollup.</p>
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
                    {!(topicRollupQuery.data?.canonical_files.length || topicRollupQuery.data?.canonical_errors.length) ? (
                      <span className="text-muted-foreground">No canonical signals yet.</span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="font-medium">Recent Cases</div>
                {topicCasesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading Cases…</p>
                ) : topicCasesQuery.isError ? (
                  <p className="text-sm text-destructive">Couldn’t load Cases for this Topic.</p>
                ) : (topicCasesQuery.data?.data.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No Cases under this Topic yet.</p>
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
                          {caseItem.summary_current || caseItem.input_summary || "No summary yet."}
                        </p>
                      </button>
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
