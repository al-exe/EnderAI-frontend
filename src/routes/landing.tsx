import { createFileRoute, Link } from "@tanstack/react-router"

import { LandingTerminal } from "@/components/V2/LandingTerminal"

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

const proofStats = [
  { label: "Tokens saved", value: "$1,237 / 82.4M tokens" },
  { label: "Context saved", value: "127 work sessions" },
  { label: "Setup time", value: "3 minutes" },
]

function LandingExpressive() {
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
              Taskforce is a harness-agnostic, continual-learning{" "}
              <b className="font-medium text-zinc-950 dark:text-white">
                memory
              </b>{" "}
              layer for coding agents. It remembers the work your team has
              already done so the next agent doesn't rediscover the same
              answers. Works with Claude Code, Codex, and Cursor.
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
            {proofStats.map((stat) => (
              <div
                key={stat.label}
                className="border-b border-zinc-200 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-4 sm:first:pl-0 sm:last:border-r-0 dark:border-white/10"
              >
                <dt className="uppercase tracking-[0.16em]">{stat.label}</dt>
                <dd className="mt-1 font-sans text-[1.09375rem] font-semibold leading-snug text-zinc-950 dark:text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex min-h-[36rem] flex-col justify-end bg-zinc-50 px-5 py-6 dark:bg-zinc-900/40 md:min-h-0 md:items-end md:px-8 md:py-8">
          <div className="w-full max-w-[42rem]">
            <LandingTerminal />
          </div>
        </div>
      </section>
    </main>
  )
}
