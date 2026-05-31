import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import methodologyRaw from "@/components/V2/Metrics/methodology.md?raw"
import { V2_PAGE_CONTENT } from "@/components/V2/v2PageShell"

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
    <div className={V2_PAGE_CONTENT}>
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
        <Link
          to="/v2/metrics"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Metrics
        </Link>
        <article className="pb-8 text-sm leading-6 text-foreground">
          <Markdown source={methodologyRaw} />
        </article>
      </div>
    </div>
  )
}

function Markdown({ source }: { source: string }) {
  const lines = source.split("\n")
  const blocks: ReactNode[] = []
  let bulletBuffer: string[] = []
  let orderedBuffer: string[] = []
  let paragraphBuffer: string[] = []
  let codeBuffer: string[] | null = null

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-3 list-disc space-y-1 pl-6">
        {bulletBuffer.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    bulletBuffer = []
  }

  const flushOrdered = () => {
    if (orderedBuffer.length === 0) return
    blocks.push(
      <ol
        key={`ol-${blocks.length}`}
        className="my-3 list-decimal space-y-2 pl-6"
      >
        {orderedBuffer.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ol>,
    )
    orderedBuffer = []
  }

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(" ")
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-3 text-pretty">
        {renderInline(text)}
      </p>,
    )
    paragraphBuffer = []
  }

  const flushCode = () => {
    if (codeBuffer === null || codeBuffer.length === 0) return
    blocks.push(
      <pre
        key={`pre-${blocks.length}`}
        className="my-4 overflow-x-auto rounded-md border border-border bg-muted p-4 font-mono text-[0.8125rem] leading-relaxed text-foreground"
      >
        <code>{codeBuffer.join("\n")}</code>
      </pre>,
    )
    codeBuffer = null
  }

  const flushAll = () => {
    flushCode()
    flushBullets()
    flushOrdered()
    flushParagraph()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith("```")) {
      if (codeBuffer === null) {
        flushBullets()
        flushOrdered()
        flushParagraph()
        codeBuffer = []
      } else {
        flushCode()
      }
      continue
    }

    if (codeBuffer !== null) {
      codeBuffer.push(raw)
      continue
    }

    if (line.startsWith("# ")) {
      flushAll()
      blocks.push(
        <h1
          key={`h-${blocks.length}`}
          className="mt-2 text-2xl font-semibold tracking-tight"
        >
          {line.slice(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      flushAll()
      blocks.push(
        <h2 key={`h-${blocks.length}`} className="mt-8 text-lg font-semibold">
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      flushAll()
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="mt-6 text-base font-semibold">
          {line.slice(4)}
        </h3>,
      )
    } else if (line.startsWith("- ")) {
      flushOrdered()
      flushParagraph()
      bulletBuffer.push(line.slice(2))
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets()
      flushParagraph()
      orderedBuffer.push(line.replace(/^\d+\.\s/, ""))
    } else if (line === "") {
      flushBullets()
      flushOrdered()
      flushParagraph()
    } else {
      flushBullets()
      flushOrdered()
      paragraphBuffer.push(line)
    }
  }

  flushAll()
  return <>{blocks}</>
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let match: RegExpExecArray | null = re.exec(text)
  let index = 0

  while (match !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index))
    }
    if (match[1] != null && match[2] != null) {
      parts.push(
        <a
          key={index}
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
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {match[3]}
        </code>,
      )
    } else if (match[4] != null) {
      parts.push(
        <strong key={index} className="font-semibold text-foreground">
          {match[4]}
        </strong>,
      )
    } else if (match[5] != null) {
      parts.push(<em key={index}>{match[5]}</em>)
    }
    cursor = re.lastIndex
    index += 1
    match = re.exec(text)
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
