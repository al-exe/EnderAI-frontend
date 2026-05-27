import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

type Line = {
  name: "you" | "tf"
  tone: "prompt" | "dim" | "body"
  text: string
  accent?: string
}

type Scenario = {
  branch: string
  lines: Line[]
  summary: {
    profile: string
    saved: string
  }
}

const SCENARIOS: Scenario[] = [
  {
    branch: "fix/stripe-webhook-double-fulfillment",
    summary: { profile: "Jensen profile · 2 docs referenced", saved: "$614" },
    lines: [
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
    ],
  },
  {
    branch: "fix/jwt-refresh-race",
    summary: { profile: "Mira profile · 3 docs referenced", saved: "$892" },
    lines: [
      {
        name: "you",
        tone: "prompt",
        text: "/tf Mobile clients are getting kicked out mid-session — JWT refresh is racing the new rotation flow. Can you patch it?",
      },
      {
        name: "tf",
        tone: "dim",
        text: "Checking Taskforce for the right profile...",
      },
      {
        name: "tf",
        tone: "dim",
        text: 'Sending prompt + cwd + files + git_branch "fix/jwt-refresh-race". No code body. No chat history.',
      },
      {
        name: "tf",
        tone: "body",
        text: "Selected profile: Mira — Auth & Sessions.",
        accent: "Confidence: high · JWT rotation · refresh race",
      },
      {
        name: "tf",
        tone: "body",
        text: "Mira is bringing in the refresh-token mutex pattern and last quarter's rotation rollback notes.",
      },
      {
        name: "you",
        tone: "prompt",
        text: "Apply it and add a regression that two parallel refreshes only consume one rotation.",
      },
      {
        name: "tf",
        tone: "body",
        text: "Patch applied. Race test passes. Recording the session back to Taskforce.",
      },
    ],
  },
  {
    branch: "perf/orders-list-n-plus-one",
    summary: { profile: "Park profile · 4 docs referenced", saved: "$1,103" },
    lines: [
      {
        name: "you",
        tone: "prompt",
        text: "/tf Orders page is taking 8s to load for big merchants — looks like an N+1. Can you trace it?",
      },
      {
        name: "tf",
        tone: "dim",
        text: "Checking Taskforce for the right profile...",
      },
      {
        name: "tf",
        tone: "dim",
        text: 'Sending prompt + cwd + files + git_branch "perf/orders-list-n-plus-one". No code body. No chat history.',
      },
      {
        name: "tf",
        tone: "body",
        text: "Selected profile: Park — Query Performance.",
        accent: "Confidence: high · ORM N+1 · merchant scale",
      },
      {
        name: "tf",
        tone: "body",
        text: "Park is bringing in the prefetch_related playbook from the inventory refactor.",
      },
      {
        name: "you",
        tone: "prompt",
        text: "Apply it and prove the query count drops below 5 for 1k orders.",
      },
      {
        name: "tf",
        tone: "body",
        text: "Patch written. Query trace: 412 → 4. Recording the session back to Taskforce.",
      },
    ],
  },
  {
    branch: "hotfix/blue-green-cutover",
    summary: { profile: "Iris profile · 3 docs referenced", saved: "$478" },
    lines: [
      {
        name: "you",
        tone: "prompt",
        text: "/tf Blue/green cutover is failing the readiness gate on us-east-2 since the new health check landed. What broke?",
      },
      {
        name: "tf",
        tone: "dim",
        text: "Checking Taskforce for the right profile...",
      },
      {
        name: "tf",
        tone: "dim",
        text: 'Sending prompt + cwd + files + git_branch "hotfix/blue-green-cutover". No code body. No chat history.',
      },
      {
        name: "tf",
        tone: "body",
        text: "Selected profile: Iris — Release Engineering.",
        accent: "Confidence: high · readiness probes · cutover",
      },
      {
        name: "tf",
        tone: "body",
        text: "Iris is bringing in the readiness-grace bump from the March rollback and the ALB drain timing notes.",
      },
      {
        name: "you",
        tone: "prompt",
        text: "Apply the grace bump and rerun the canary.",
      },
      {
        name: "tf",
        tone: "body",
        text: "Probe grace tuned. Canary green. Recording the session back to Taskforce.",
      },
    ],
  },
  {
    branch: "fix/react-key-collision",
    summary: { profile: "Noor profile · 2 docs referenced", saved: "$356" },
    lines: [
      {
        name: "you",
        tone: "prompt",
        text: "/tf Library list is dropping rows in prod after the virtualization swap — keys collide on duplicate titles. Fix?",
      },
      {
        name: "tf",
        tone: "dim",
        text: "Checking Taskforce for the right profile...",
      },
      {
        name: "tf",
        tone: "dim",
        text: 'Sending prompt + cwd + files + git_branch "fix/react-key-collision". No code body. No chat history.',
      },
      {
        name: "tf",
        tone: "body",
        text: "Selected profile: Noor — Frontend Reliability.",
        accent: "Confidence: high · virtualization · key strategy",
      },
      {
        name: "tf",
        tone: "body",
        text: "Noor is bringing in the stable-id derivation pattern we shipped for the metrics table.",
      },
      {
        name: "you",
        tone: "prompt",
        text: "Apply it and assert no duplicate keys for 5k generated docs.",
      },
      {
        name: "tf",
        tone: "body",
        text: "Stable keys wired. Render test green. Recording the session back to Taskforce.",
      },
    ],
  },
]

const YOU_CHAR_MS = 20
const YOU_CHAR_JITTER = 23
const TF_CHAR_MS = 8
const ACCENT_CHAR_MS = 11
const PRE_LINE_PAUSE_YOU = 650
const PRE_LINE_PAUSE_TF = 380
const POST_LINE_PAUSE = 320
const SUMMARY_HOLD_MS = 5000
const CLOSE_SLIDE_MS = 720
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

export type LandingTerminalEvent =
  | { type: "cycle-reset" }
  | { type: "reveal"; savedUsd: number }

function parseSavedUsd(s: string): number {
  return Number(s.replace(/[^0-9.]/g, ""))
}

export function LandingTerminal({
  onEvent,
}: {
  onEvent?: (event: LandingTerminalEvent) => void
} = {}) {
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [active, setActive] = useState<ActiveLine | null>(null)
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [bodyVisible, setBodyVisible] = useState(true)
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (prefersReducedMotion()) {
      setScenarioIndex(0)
      setVisibleCount(SCENARIOS[0].lines.length)
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
        let s = Math.floor(Math.random() * SCENARIOS.length)
        let revealsInCycle = 0
        while (!signal.aborted) {
          if (revealsInCycle === 0) {
            onEventRef.current?.({ type: "cycle-reset" })
          }
          setScenarioIndex(s)
          setVisibleCount(0)
          setActive(null)
          setSummaryVisible(false)
          setBodyVisible(true)
          await wait(LOOP_PAUSE_MS)

          const scenario = SCENARIOS[s]
          for (let i = 0; i < scenario.lines.length; i++) {
            const line = scenario.lines[i]
            await wait(
              line.name === "you" ? PRE_LINE_PAUSE_YOU : PRE_LINE_PAUSE_TF,
            )
            await streamLine(i, line)
            setVisibleCount(i + 1)
            setActive(null)
            await wait(POST_LINE_PAUSE)
          }

          await wait(500)
          setSummaryVisible(true)
          onEventRef.current?.({
            type: "reveal",
            savedUsd: parseSavedUsd(scenario.summary.saved),
          })
          await wait(SUMMARY_HOLD_MS)

          setBodyVisible(false)
          await wait(CLOSE_SLIDE_MS)

          revealsInCycle = (revealsInCycle + 1) % SCENARIOS.length
          s = (s + 1) % SCENARIOS.length
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

  const scenario = SCENARIOS[scenarioIndex]

  return (
    <div className="overflow-hidden border border-zinc-950 bg-zinc-950 p-3 font-mono text-[0.68rem] leading-5 text-zinc-100 shadow-2xl dark:border-white/15 md:p-4 lg:text-[0.72rem]">
      <div className="mb-3 flex items-center gap-2 border-b border-white/15 pb-3">
        <span className="size-1.5 bg-emerald-400" />
        <span className="text-zinc-200">claude — {scenario.branch}</span>
      </div>

      <div
        className={cn(
          "transition-transform ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform",
          bodyVisible
            ? "translate-y-0 duration-200"
            : "translate-y-[120%] duration-[720ms]",
        )}
      >
        <div className="space-y-1.5" aria-hidden="true">
        {scenario.lines.map((line, index) => {
          const isFull = index < visibleCount
          const isActive = active?.index === index
          if (!isFull && !isActive) return null

          const displayedText = isFull ? line.text : (active?.text ?? "")
          const displayedAccent = isFull ? line.accent : (active?.accent ?? "")

          return (
            <div
              key={`${scenarioIndex}-${index}`}
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
            summaryVisible
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
          aria-hidden={!summaryVisible}
        >
          <div>
            <div className="uppercase tracking-[0.16em] text-zinc-500">
              recorded
            </div>
            <div className="mt-1 text-zinc-200">{scenario.summary.profile}</div>
          </div>
          <div>
            <div className="uppercase tracking-[0.16em] text-zinc-500">saved</div>
            <div className="mt-1 text-sm font-semibold text-[#c9a8ff] tabular-nums">
              {scenario.summary.saved}
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
