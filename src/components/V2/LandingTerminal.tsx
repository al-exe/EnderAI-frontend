import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type Line = {
  name: "you" | "tf"
  tone: "prompt" | "dim" | "body"
  text: string
  accent?: string
}

const LINES: Line[] = [
  {
    name: "you",
    tone: "prompt",
    text: "/tf Stripe is double-charging users on plan upgrades — webhook retries are getting fulfilled twice. Can you fix it?",
  },
  {
    name: "tf",
    tone: "dim",
    text: "Checking Taskforce for the right profile...",
  },
  {
    name: "tf",
    tone: "dim",
    text: 'Sending prompt + cwd + files + git_branch "fix/stripe-webhook-double-fulfillment". No code body. No chat history.',
  },
  {
    name: "tf",
    tone: "body",
    text: "Selected profile: Jensen — Billing Reliability.",
    accent: "Confidence: high · Stripe webhook retries · plan upgrades",
  },
  {
    name: "tf",
    tone: "body",
    text: "Jensen is bringing in Stripe webhook idempotency strategy and the plan-upgrade replay regression pattern.",
  },
  {
    name: "you",
    tone: "prompt",
    text: "Apply that pattern and prove the retry only fulfills once.",
  },
  {
    name: "tf",
    tone: "body",
    text: "Patch written. Regression test passes. Recording the session back to Taskforce.",
  },
]

const YOU_CHAR_MS = 22
const YOU_CHAR_JITTER = 26
const TF_CHAR_MS = 9
const ACCENT_CHAR_MS = 12
const PRE_LINE_PAUSE_YOU = 650
const PRE_LINE_PAUSE_TF = 380
const POST_LINE_PAUSE = 320
const SUMMARY_HOLD_MS = 6500
const LOOP_PAUSE_MS = 700

type ActiveLine = {
  index: number
  text: string
  accent: string
}

function waitWithSignal(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("aborted", "AbortError"))
      return
    }
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(id)
      reject(new DOMException("aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function LandingTerminal() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [active, setActive] = useState<ActiveLine | null>(null)
  const [summaryVisible, setSummaryVisible] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisibleCount(LINES.length)
      setSummaryVisible(true)
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    const wait = (ms: number) => waitWithSignal(ms, signal)

    const streamLine = async (index: number, line: Line) => {
      const perChar = line.name === "you" ? YOU_CHAR_MS : TF_CHAR_MS
      const jitter = line.name === "you" ? YOU_CHAR_JITTER : 0
      for (let c = 1; c <= line.text.length; c++) {
        setActive({ index, text: line.text.slice(0, c), accent: "" })
        await wait(perChar + (jitter > 0 ? Math.random() * jitter : 0))
      }
      if (line.accent) {
        await wait(220)
        for (let c = 1; c <= line.accent.length; c++) {
          setActive({
            index,
            text: line.text,
            accent: line.accent.slice(0, c),
          })
          await wait(ACCENT_CHAR_MS)
        }
      }
    }

    const play = async () => {
      try {
        while (!signal.aborted) {
          setVisibleCount(0)
          setActive(null)
          setSummaryVisible(false)
          await wait(LOOP_PAUSE_MS)

          for (let i = 0; i < LINES.length; i++) {
            const line = LINES[i]
            await wait(line.name === "you" ? PRE_LINE_PAUSE_YOU : PRE_LINE_PAUSE_TF)
            await streamLine(i, line)
            setVisibleCount(i + 1)
            setActive(null)
            await wait(POST_LINE_PAUSE)
          }

          await wait(500)
          setSummaryVisible(true)
          await wait(SUMMARY_HOLD_MS)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        throw error
      }
    }

    void play()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div className="border border-zinc-950 bg-zinc-950 p-3 font-mono text-[0.68rem] leading-5 text-zinc-100 shadow-2xl dark:border-white/15 md:p-4 lg:text-[0.72rem]">
      <div className="mb-3 flex items-center gap-2 border-b border-white/15 pb-3">
        <span className="size-1.5 bg-emerald-400" />
        <span className="text-zinc-200">
          claude — fix/stripe-webhook-double-fulfillment
        </span>
      </div>

      <div className="space-y-1.5" aria-hidden="true">
        {LINES.map((line, index) => {
          const isFull = index < visibleCount
          const isActive = active?.index === index
          if (!isFull && !isActive) return null

          const displayedText = isFull ? line.text : active?.text ?? ""
          const displayedAccent = isFull
            ? line.accent
            : active?.accent ?? ""

          return (
            <div
              key={`${line.name}-${index}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2"
            >
              <span
                className={
                  line.name === "tf" ? "text-[#c9a8ff]" : "text-zinc-500"
                }
              >
                {line.name}
              </span>
              <span
                className={
                  line.tone === "dim"
                    ? "text-zinc-500"
                    : line.tone === "prompt"
                      ? "text-zinc-100"
                      : "text-zinc-300"
                }
              >
                {displayedText}
                {isActive && !displayedAccent && (
                  <BlinkingCaret tone={line.tone} />
                )}
                {(displayedAccent || (isFull && line.accent)) && (
                  <span className="block text-emerald-300">
                    {displayedAccent}
                    {isActive && line.accent && <BlinkingCaret tone="accent" />}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <div
        className={cn(
          "mt-4 grid gap-3 border border-white/15 bg-white/[0.04] p-3 text-[0.65rem] transition-opacity duration-300 sm:grid-cols-[1fr_auto_auto]",
          summaryVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!summaryVisible}
      >
        <div>
          <div className="uppercase tracking-[0.16em] text-zinc-500">
            recorded
          </div>
          <div className="mt-1 text-zinc-200">
            Jensen profile · 2 docs referenced
          </div>
        </div>
        <div>
          <div className="uppercase tracking-[0.16em] text-zinc-500">
            saved
          </div>
          <div className="mt-1 text-sm font-semibold text-[#c9a8ff] tabular-nums">
            $614
          </div>
        </div>
        <div>
          <div className="uppercase tracking-[0.16em] text-zinc-500">
            metrics
          </div>
          <div className="mt-1 text-zinc-200">session link ready →</div>
        </div>
      </div>
    </div>
  )
}

function BlinkingCaret({
  tone,
}: {
  tone: "prompt" | "dim" | "body" | "accent"
}) {
  const color =
    tone === "prompt"
      ? "bg-zinc-100"
      : tone === "accent"
        ? "bg-emerald-300"
        : tone === "dim"
          ? "bg-zinc-500"
          : "bg-zinc-300"
  return (
    <span
      className={cn(
        "ml-0.5 inline-block w-[0.45em] translate-y-[0.1em] animate-pulse align-baseline",
        color,
      )}
      style={{ height: "0.9em" }}
    />
  )
}
