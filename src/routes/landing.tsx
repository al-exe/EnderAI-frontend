import { createFileRoute, Link } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  LandingTerminal,
  type LandingTerminalEvent,
} from "@/components/V2/LandingTerminal"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/landing")({
  component: LandingExpressive,
  head: () => ({
    meta: [
      {
        title: "Taskforce | AI work memory",
      },
    ],
  }),
})

const BASE_TOKENS = 82_400_000
const BASE_DOLLARS = 1_237
const BASE_SESSIONS = 127
const TOKENS_PER_DOLLAR = BASE_TOKENS / BASE_DOLLARS

function formatTokens(n: number): string {
  return `${(n / 1_000_000).toFixed(1)}M tokens`
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function formatSessions(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} work sessions`
}

function CountUp({
  value,
  format,
  duration = 750,
}: {
  value: number
  format: (n: number) => string
  duration?: number
}) {
  const [displayed, setDisplayed] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const from = fromRef.current
    if (from === value) {
      setDisplayed(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplayed(from + (value - from) * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className="tabular-nums">{format(displayed)}</span>
}

function LandingExpressive() {
  const [stats, setStats] = useState({
    tokens: BASE_TOKENS,
    dollars: BASE_DOLLARS,
    sessions: BASE_SESSIONS,
  })
  const [tokensPulsing, setTokensPulsing] = useState(false)
  const pulseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  const handleTerminalEvent = useCallback((event: LandingTerminalEvent) => {
    if (event.type === "cycle-reset") {
      setStats({
        tokens: BASE_TOKENS,
        dollars: BASE_DOLLARS,
        sessions: BASE_SESSIONS,
      })
      setTokensPulsing(false)
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current)
        pulseTimerRef.current = null
      }
    } else if (event.type === "reveal") {
      setStats((prev) => ({
        tokens: prev.tokens + event.savedUsd * TOKENS_PER_DOLLAR,
        dollars: prev.dollars + event.savedUsd,
        sessions: prev.sessions + 1,
      }))
      setTokensPulsing(true)
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current)
      }
      pulseTimerRef.current = window.setTimeout(() => {
        setTokensPulsing(false)
        pulseTimerRef.current = null
      }, 5000)
    }
  }, [])

  return (
    <main
      data-testid="landing-expressive"
      className="min-h-svh overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
    >
      <nav className="relative z-10 flex h-[5.46875rem] items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-white/10 dark:bg-zinc-950 md:px-8">
        <Link
          to="/landing"
          className="inline-flex items-center gap-3 text-[1.3671875rem] font-semibold leading-none"
          aria-label="Taskforce landing"
        >
          <img
            src="/assets/brand/tf-icon-filled.svg"
            alt=""
            className="size-[2.34375rem] dark:hidden"
          />
          <img
            src="/assets/brand/tf-icon-filled-dark.svg"
            alt=""
            className="hidden size-[2.34375rem] dark:block"
          />
          Taskforce
        </Link>
        <div className="flex items-center gap-5 font-mono text-[0.796875rem] text-zinc-500 dark:text-zinc-400">
          <Link
            to="/pricing"
            className="hidden hover:text-zinc-950 dark:hover:text-white sm:inline"
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="bg-zinc-950 px-[0.78125rem] py-[0.46875rem] text-white dark:bg-white dark:text-zinc-950"
          >
            Sign up →
          </Link>
        </div>
      </nav>

      <section className="grid min-h-[calc(100svh-5.46875rem)] md:grid-cols-2">
        <div className="relative flex flex-col justify-start border-b border-zinc-200 px-5 py-8 dark:border-white/10 md:border-r md:border-b-0 md:px-8 md:py-10">
          <div className="max-w-2xl">
            <div className="font-mono text-[0.85rem] font-medium uppercase tracking-[0.22em] text-[#8447ff]">
              AI work memory for engineering teams
            </div>
            <h1 className="mt-4 max-w-[14ch] text-5xl font-semibold leading-[0.96] tracking-[-0.035em] text-balance md:text-6xl lg:text-7xl">
              Stop <em className="not-italic text-[#8447ff]">re-explaining</em>{" "}
              your codebase.
            </h1>
            <p className="mt-5 max-w-[50ch] text-sm leading-6 text-zinc-600 text-pretty dark:text-zinc-300 md:text-base">
              Taskforce is a{" "}
              <span className="text-[#8447ff]">
                continual-learning memory layer
              </span>{" "}
              for coding agents. It remembers the work you've done so the next
              agent doesn't have to rediscover the same answers.
            </p>
            <p className="mt-3 max-w-[50ch] font-mono text-xs leading-5 tracking-[0.02em] text-zinc-500 dark:text-zinc-400">
              Works with Claude Code, Codex, and Cursor.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/signup"
                className="border border-zinc-950 bg-zinc-950 px-4 py-3 font-mono text-xs tracking-[0.04em] text-white dark:border-white dark:bg-white dark:text-zinc-950"
              >
                Start free →
              </Link>
              <Link
                to="/login"
                className="border border-zinc-950 px-4 py-3 font-mono text-xs tracking-[0.04em] hover:bg-zinc-950 hover:text-white dark:border-white/30 dark:hover:bg-white dark:hover:text-zinc-950"
              >
                Open Taskforce
              </Link>
            </div>
          </div>

          <dl className="mt-10 grid border-t border-zinc-200 pt-4 font-mono text-[0.85rem] text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:grid-cols-3 md:mt-auto">
            <div className="border-b border-zinc-200 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-4 sm:first:pl-0 sm:last:border-r-0 dark:border-white/10">
              <dt className="uppercase tracking-[0.16em]">Tokens saved</dt>
              <dd
                className={cn(
                  "mt-1 font-sans text-[1.09375rem] font-semibold leading-snug transition-colors duration-700",
                  tokensPulsing
                    ? "text-[#8447ff]"
                    : "text-zinc-950 dark:text-white",
                )}
              >
                <CountUp value={stats.tokens} format={formatTokens} />
                {" / "}
                <CountUp value={stats.dollars} format={formatDollars} />
              </dd>
            </div>
            <div className="border-b border-zinc-200 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-4 sm:first:pl-0 sm:last:border-r-0 dark:border-white/10">
              <dt className="uppercase tracking-[0.16em]">Context saved</dt>
              <dd className="mt-1 font-sans text-[1.09375rem] font-semibold leading-snug text-zinc-950 dark:text-white">
                <CountUp value={stats.sessions} format={formatSessions} />
              </dd>
            </div>
            <div className="border-b border-zinc-200 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-4 sm:first:pl-0 sm:last:border-r-0 dark:border-white/10">
              <dt className="uppercase tracking-[0.16em]">Setup time</dt>
              <dd className="mt-1 font-sans text-[1.09375rem] font-semibold leading-snug text-zinc-950 dark:text-white">
                3 minutes
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex min-h-[36rem] flex-col justify-end bg-zinc-50 px-5 py-6 dark:bg-zinc-900/40 md:min-h-0 md:items-end md:px-8 md:py-8">
          <div className="w-full max-w-[42rem]">
            <LandingTerminal onEvent={handleTerminalEvent} />
          </div>
        </div>
      </section>
    </main>
  )
}
