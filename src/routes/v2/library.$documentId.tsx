import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { useDemoMode } from "@/components/demo-mode-provider"
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
    <section className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto flex w-full max-w-3xl flex-col pb-16">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link to="/v2/library">
            <ArrowLeft className="size-4" />
            Library
          </Link>
        </Button>

        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {demoDocument.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {demoDocument.description}
        </p>

        <dl className="mt-6 grid gap-2 border-y py-4 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{demoDocument.createdAt}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{demoDocument.updatedAt}</dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <dt className="text-muted-foreground">Collaborators</dt>
            <dd>{demoDocument.collaborators.join(", ")}</dd>
          </div>
        </dl>

        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "human" | "ai")}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="human">Summary</TabsTrigger>
            <TabsTrigger value="ai">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="human" className="mt-8 space-y-9">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight">
                Executive summary
              </h2>
              <p className="text-lg leading-8">{demoDocument.humanSummary}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight">
                Main body
              </h2>
              <div className="space-y-5 text-base leading-8 text-foreground">
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

            <section className="space-y-3 border-t pt-7">
              <h2 className="text-base font-semibold tracking-tight text-muted-foreground">
                AI-generated summary
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {demoDocument.aiGeneratedSummary}
              </p>
            </section>
          </TabsContent>

          <TabsContent value="ai" className="mt-8 space-y-8">
            {demoDocument.aiSections.map((section) => (
              <section
                key={section.anchorId}
                id={section.anchorId}
                className={cn(
                  "scroll-mt-6 space-y-3 border-l border-transparent pl-4 transition-colors",
                  activeEvidenceAnchorId === section.anchorId &&
                    "border-purple-300 bg-purple-50/40 py-3 pr-3 dark:border-purple-700 dark:bg-purple-950/20",
                )}
              >
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {section.anchorId}
                </p>
                <h2 className="text-xl font-semibold tracking-tight">
                  {section.heading}
                </h2>
                <p
                  data-testid={`ai-evidence-${section.anchorId}`}
                  data-active-evidence={
                    activeEvidenceAnchorId === section.anchorId
                      ? "true"
                      : "false"
                  }
                  className={cn(
                    "rounded-sm text-base leading-7 text-muted-foreground transition-colors",
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
      </article>
    </section>
  )
}
