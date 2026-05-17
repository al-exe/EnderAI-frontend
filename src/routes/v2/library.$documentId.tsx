import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, X } from "lucide-react"
import { useState } from "react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  findV2DemoDocument,
  type V2DemoDocument,
} from "@/lib/v2-demo-documents"

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

type ViewMode = "summary" | "details" | "split"

function TaskforceDocumentDetail() {
  const { documentId } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const [viewMode, setViewMode] = useState<ViewMode>("summary")
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
    setViewMode("split")
    window.setTimeout(() => {
      window.document
        .getElementById(anchorId)
        ?.scrollIntoView({ block: "start", behavior: "smooth" })
    }, 0)
  }

  const closeSplit = () => {
    setViewMode("summary")
    setActiveEvidenceAnchorId(undefined)
  }

  const summaryVisible = viewMode === "summary" || viewMode === "split"
  const detailsVisible = viewMode === "details" || viewMode === "split"
  const isSplit = viewMode === "split"

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isSplit ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto",
      )}
    >
      <article
        className={cn(
          "mx-auto flex w-full max-w-none flex-col",
          isSplit ? "md:min-h-0 md:flex-1 md:overflow-hidden" : "pb-16",
        )}
      >
        <div className={cn(isSplit && "md:shrink-0")}>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
            <Link to="/v2/library">
              <ArrowLeft className="size-4" />
              Library
            </Link>
          </Button>

          <h1
            className={cn(
              "font-semibold tracking-tight text-foreground",
              isSplit ? "text-2xl" : "text-4xl",
            )}
          >
            {demoDocument.title}
          </h1>
          <p
            className={cn(
              "text-muted-foreground",
              isSplit ? "mt-1 text-sm leading-6" : "mt-4 text-base leading-7",
            )}
          >
            {demoDocument.description}
          </p>

          {!isSplit && (
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
          )}

          <div
            role="tablist"
            aria-label="Document view"
            className={cn(
              "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
              isSplit ? "mt-4" : "mt-6",
            )}
          >
            <ViewToggle
              label="Summary"
              active={summaryVisible}
              onClick={() => {
                setViewMode("summary")
                setActiveEvidenceAnchorId(undefined)
              }}
            />
            <ViewToggle
              label="Details"
              active={detailsVisible}
              onClick={() => {
                setViewMode("details")
                setActiveEvidenceAnchorId(undefined)
              }}
            />
          </div>
        </div>

        <div
          className={cn(
            "gap-6",
            isSplit
              ? "mt-4 grid grid-cols-1 md:grid md:min-h-0 md:flex-1 md:grid-cols-2 md:overflow-hidden md:pb-4"
              : "mt-8 block",
          )}
        >
          {summaryVisible && (
            <SummaryPane
              demoDocument={demoDocument}
              onShowEvidence={showEvidence}
              isSplit={isSplit}
            />
          )}

          {detailsVisible && (
            <DetailsPane
              demoDocument={demoDocument}
              activeEvidenceAnchorId={activeEvidenceAnchorId}
              showClose={isSplit}
              onClose={closeSplit}
              isSplit={isSplit}
            />
          )}
        </div>
      </article>
    </section>
  )
}

function ViewToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={onClick}
      className="inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1 text-sm font-medium text-foreground transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground"
    >
      {label}
    </button>
  )
}

function SummaryPane({
  demoDocument,
  onShowEvidence,
  isSplit,
}: {
  demoDocument: V2DemoDocument
  onShowEvidence: (anchorId: string) => void
  isSplit: boolean
}) {
  return (
    <div
      className={cn(
        "space-y-9",
        isSplit && "md:min-h-0 md:overflow-y-auto md:pb-4 md:pr-2",
      )}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Executive summary
        </h2>
        <p className="text-lg leading-8">{demoDocument.humanSummary}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Main body</h2>
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
                    onClick={() => onShowEvidence(evidenceAnchorId)}
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
    </div>
  )
}

function DetailsPane({
  demoDocument,
  activeEvidenceAnchorId,
  showClose,
  onClose,
  isSplit,
}: {
  demoDocument: V2DemoDocument
  activeEvidenceAnchorId: string | undefined
  showClose: boolean
  onClose: () => void
  isSplit: boolean
}) {
  return (
    <section
      aria-label={`${demoDocument.detailsFileName} markdown details`}
      className={cn(
        "overflow-hidden rounded-md border bg-card",
        isSplit && "md:flex md:min-h-0 md:flex-col",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground",
          isSplit && "md:shrink-0",
        )}
      >
        <span className="truncate">{demoDocument.detailsFileName}</span>
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="evidence-split-close"
            aria-label="Close details pane"
            onClick={onClose}
            className="-mr-2 h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
            <span className="font-sans">Close</span>
          </Button>
        )}
      </div>
      <div
        className={cn(
          "px-5 py-4",
          isSplit && "md:min-h-0 md:flex-1 md:overflow-y-auto",
        )}
      >
        {demoDocument.detailsMarkdownSections.map((section) => (
          <pre
            key={section.anchorId}
            id={section.anchorId}
            data-testid={`ai-evidence-${section.anchorId}`}
            data-active-evidence={
              activeEvidenceAnchorId === section.anchorId ? "true" : "false"
            }
            className={cn(
              "scroll-mt-6 whitespace-pre-wrap rounded-sm py-2 font-mono text-sm leading-6 text-foreground transition-colors",
              activeEvidenceAnchorId === section.anchorId &&
                "bg-purple-100/80 px-3 text-purple-950 dark:bg-purple-950/60 dark:text-purple-100",
            )}
          >
            <code>{section.markdown}</code>
          </pre>
        ))}
      </div>
    </section>
  )
}
