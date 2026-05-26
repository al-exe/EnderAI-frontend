import { createFileRoute, Link } from "@tanstack/react-router"

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
  { label: "Saved in demo", value: "50,359 tokens" },
  { label: "Specialist routed", value: "Jensen" },
  { label: "Setup", value: "4-min MCP" },
]

const terminalLines = [
  {
    name: "you",
    tone: "prompt",
    text: "/tf Stripe is double-charging users on plan upgrades — webhook retries are getting fulfilled twice. Can you fix it?",
  },
  {
    name: "tf",
    tone: "dim",
    text: "Checking Taskforce for the right specialist...",
  },
  {
    name: "tf",
    tone: "dim",
    text: 'Sending prompt + cwd + files + git_branch "demo/stripe-double-charge". No code body. No chat history.',
  },
  {
    name: "tf",
    tone: "body",
    text: "Routed to Jensen — Billing Reliability Specialist.",
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

function LandingExpressive() {
  return (
    <main
      data-testid="landing-expressive"
      className="min-h-svh overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
    >
      <nav className="relative z-10 flex h-[4.375rem] items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-white/10 dark:bg-zinc-950 md:px-8">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2.5 text-[1.09375rem] font-semibold leading-none"
          aria-label="Taskforce landing"
        >
          <img
            src="/assets/brand/tf-icon-filled.svg"
            alt=""
            className="size-[1.875rem] dark:hidden"
          />
          <img
            src="/assets/brand/tf-icon-filled-dark.svg"
            alt=""
            className="hidden size-[1.875rem] dark:block"
          />
          Taskforce
        </Link>
        <div className="flex items-center gap-4 font-mono text-[0.85rem] text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">Docs</span>
          <span className="hidden sm:inline">Pricing</span>
          <Link
            to="/login"
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="bg-zinc-950 px-[0.9375rem] py-2.5 text-white dark:bg-white dark:text-zinc-950"
          >
            Sign up →
          </Link>
        </div>
      </nav>

      <section className="grid min-h-[calc(100svh-4.375rem)] md:grid-cols-2">
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
              Taskforce turns agent sessions into linkable{" "}
              <b className="font-medium text-zinc-950 dark:text-white">
                documents
              </b>
              , routes new prompts to the right specialist, and replays the
              relevant decisions before another engineer starts from zero.
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
            <div className="border border-zinc-950 bg-zinc-950 p-3 font-mono text-[0.68rem] leading-5 text-zinc-100 shadow-2xl dark:border-white/15 md:p-4 lg:text-[0.72rem]">
              <div className="mb-3 flex items-center gap-2 border-b border-white/15 pb-3">
                <span className="size-1.5 bg-emerald-400" />
                <span className="text-zinc-200">
                  claude — demo/stripe-double-charge
                </span>
                <span className="ml-auto text-[0.65rem] text-zinc-500">
                  foreground skill
                </span>
              </div>

              <div className="space-y-1.5">
                {terminalLines.map((line, index) => (
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
                      {line.text}
                      {line.accent && (
                        <span className="block text-emerald-300">
                          {line.accent}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border border-white/15 bg-white/[0.04] p-3 text-[0.65rem] sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <div className="uppercase tracking-[0.16em] text-zinc-500">
                    recorded
                  </div>
                  <div className="mt-1 text-zinc-200">
                    Jensen invocation · 2 docs referenced
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.16em] text-zinc-500">
                    saved
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#c9a8ff] tabular-nums">
                    50,359
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
        </div>
      </section>
    </main>
  )
}
