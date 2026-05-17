import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CalendarDays, Users } from "lucide-react"
import { useState } from "react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { findV2DemoDocument } from "@/lib/v2-demo-documents"

export const Route = createFileRoute("/v2/library/$documentId")({
  component: TaskforceDocumentDetail,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Document",
      },
    ],
  }),
})

function TaskforceDocumentDetail() {
  const { documentId } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const [viewMode, setViewMode] = useState<"human" | "ai">("human")
  const [activeEvidenceAnchorId, setActiveEvidenceAnchorId] = useState<string>()
  const demoDocument = findV2DemoDocument(documentId)

  if (!isDemoMode) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-semibold">Demo document unavailable</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Turn on demo mode from the sidebar to view this document.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/v2/library">Back to library</Link>
          </Button>
        </div>
      </section>
    )
  }

  if (!demoDocument) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-semibold">Document not found</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            No V2 demo document exists for `{documentId}`.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/v2/library">Back to library</Link>
          </Button>
        </div>
      </section>
    )
  }

  const showEvidence = (anchorId: string) => {
    setActiveEvidenceAnchorId(anchorId)
    setViewMode("ai")
    window.setTimeout(() => {
      window.document
        .getElementById(anchorId)
        ?.scrollIntoView({ block: "start", behavior: "smooth" })
    }, 0)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="shrink-0">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link to="/v2/library">
            <ArrowLeft className="size-4" />
            Library
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{demoDocument.title}</h1>
          <Badge variant="outline">{demoDocument.status}</Badge>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {demoDocument.description}
        </p>
        <dl className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            <dt className="sr-only">Updated</dt>
            <dd>
              Created {demoDocument.createdAt} - Updated{" "}
              {demoDocument.updatedAt}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            <dt className="sr-only">Collaborators</dt>
            <dd>{demoDocument.collaborators.join(", ")}</dd>
          </div>
        </dl>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "human" | "ai")}
      >
        <TabsList>
          <TabsTrigger value="human">Human-readable</TabsTrigger>
          <TabsTrigger value="ai">AI-friendly</TabsTrigger>
        </TabsList>

        <TabsContent value="human" className="mt-4 max-w-3xl space-y-6">
          <section className="border bg-card p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              AI-generated summary
            </p>
            <p className="mt-3 text-sm leading-6">
              {demoDocument.aiGeneratedSummary}
            </p>
          </section>

          <section className="border bg-card p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Executive summary
            </p>
            <p className="mt-3 text-base leading-7">
              {demoDocument.humanSummary}
            </p>
          </section>

          <section className="border bg-card p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Main body
            </p>
            <div className="mt-3 space-y-4 text-sm leading-7 text-foreground">
              {demoDocument.mainBody.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>
                  {paragraph.segments.map((segment, segmentIndex) => {
                    const segmentKey = `${paragraphIndex}-${segmentIndex}`

                    if (!segment.evidenceAnchorId) {
                      return <span key={segmentKey}>{segment.text}</span>
                    }

                    const evidenceAnchorId = segment.evidenceAnchorId

                    return (
                      <button
                        key={segmentKey}
                        type="button"
                        aria-label={`Show evidence for: ${segment.text}`}
                        data-testid={`human-evidence-${evidenceAnchorId}`}
                        onClick={() => showEvidence(evidenceAnchorId)}
                        className="inline rounded-sm bg-purple-100/80 px-1 py-0.5 text-left text-purple-950 transition-colors hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 dark:bg-purple-950/50 dark:text-purple-100 dark:hover:bg-purple-900/70"
                      >
                        {segment.text}
                      </button>
                    )
                  })}
                </p>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="ai" className="mt-4 max-w-4xl space-y-4">
          {demoDocument.aiSections.map((section) => (
            <section
              key={section.anchorId}
              id={section.anchorId}
              className={cn(
                "scroll-mt-6 border bg-card p-5 transition-colors",
                activeEvidenceAnchorId === section.anchorId &&
                  "border-purple-300 bg-purple-50/40 ring-2 ring-purple-200 dark:border-purple-700 dark:bg-purple-950/20 dark:ring-purple-900",
              )}
            >
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {section.anchorId}
              </p>
              <h2 className="mt-2 text-base font-semibold">
                {section.heading}
              </h2>
              <p
                data-testid={`ai-evidence-${section.anchorId}`}
                data-active-evidence={
                  activeEvidenceAnchorId === section.anchorId ? "true" : "false"
                }
                className={cn(
                  "mt-3 rounded-sm text-sm leading-6 text-muted-foreground transition-colors",
                  activeEvidenceAnchorId === section.anchorId &&
                    "bg-purple-100/80 px-3 py-2 text-purple-950 dark:bg-purple-950/60 dark:text-purple-100",
                )}
              >
                {section.body}
              </p>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </section>
  )
}
