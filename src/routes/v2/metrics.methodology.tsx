import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import methodologyRaw from "@/components/V2/Metrics/methodology.md?raw"

export const Route = createFileRoute("/v2/metrics/methodology")({
  component: MetricsMethodology,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Metrics methodology",
      },
    ],
  }),
})

function MetricsMethodology() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Link
        to="/v2/metrics"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Metrics
      </Link>
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <Markdown source={methodologyRaw} />
      </article>
    </div>
  )
}

// Tiny inline markdown renderer — the page is a single static doc and we
// don't want to pull in a full markdown lib for one route. Handles the
// subset of constructs used in methodology.md.
function Markdown({ source }: { source: string }) {
  const lines = source.split("\n")
  const blocks: React.ReactNode[] = []
  let listBuffer: string[] = []
  let paragraphBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-3 list-disc pl-6">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      listBuffer = []
    }
  }
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(" ")
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-3">
          {renderInline(text)}
        </p>,
      )
      paragraphBuffer = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith("# ")) {
      flushList()
      flushParagraph()
      blocks.push(
        <h1 key={`h-${blocks.length}`} className="mt-6 text-2xl font-semibold">
          {line.slice(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      flushList()
      flushParagraph()
      blocks.push(
        <h2 key={`h-${blocks.length}`} className="mt-6 text-lg font-semibold">
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      flushList()
      flushParagraph()
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="mt-4 text-base font-semibold">
          {line.slice(4)}
        </h3>,
      )
    } else if (line.startsWith("- ")) {
      flushParagraph()
      listBuffer.push(line.slice(2))
    } else if (line === "") {
      flushList()
      flushParagraph()
    } else {
      flushList()
      paragraphBuffer.push(line)
    }
  }
  flushList()
  flushParagraph()
  return <>{blocks}</>
}

function renderInline(text: string): React.ReactNode {
  // Italic via *...*, code via `...`, links via [text](url). Run them in that
  // order so nesting works out for the methodology doc's content.
  const parts: React.ReactNode[] = []
  let cursor = 0
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*([^*]+)\*/g
  let match: RegExpExecArray | null
  let i = 0
  match = re.exec(text)
  while (match !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index))
    }
    if (match[1] != null && match[2] != null) {
      parts.push(
        <a
          key={i}
          href={match[2]}
          className="text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {match[1]}
        </a>,
      )
    } else if (match[3] != null) {
      parts.push(
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {match[3]}
        </code>,
      )
    } else if (match[4] != null) {
      parts.push(<em key={i}>{match[4]}</em>)
    }
    cursor = re.lastIndex
    i += 1
    match = re.exec(text)
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
