import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/landing")({
  component: LandingMinimal,
  head: () => ({
    meta: [
      {
        title: "Taskforce | AI work memory",
      },
    ],
  }),
})

const proofStats = [
  {
    label: "Avg tokens saved / week",
    value: "412K",
    sub: "across pilot teams · 5-12 engineers",
  },
  {
    label: "Rediscovery avoided",
    value: "73%",
    sub: "of repeat questions resolved from memory",
  },
  {
    label: "Setup time",
    value: "4 min",
    sub: "connect MCP, point at repo, done",
  },
  {
    label: "Works with",
    value: "Claude Code · Codex · Cursor",
    sub: "team library, shared across machines",
    compact: true,
  },
]

function LandingMinimal() {
  return (
    <main className="min-h-svh bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-zinc-950 md:px-8">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <picture className="grid size-6 place-items-center overflow-hidden">
            <source
              srcSet="/assets/brand/tf-icon-filled-dark.svg"
              media="(prefers-color-scheme: dark)"
            />
            <img src="/assets/brand/tf-icon-filled.svg" alt="" />
          </picture>
          Taskforce
        </Link>
        <div className="hidden items-center gap-5 font-mono text-xs tracking-[0.04em] text-zinc-500 md:flex dark:text-zinc-400">
          <span>Docs</span>
          <span>Pricing</span>
          <Link to="/login">Log in</Link>
          <Link
            to="/signup"
            className="bg-zinc-950 px-3 py-2 text-white dark:bg-white dark:text-zinc-950"
          >
            Sign up
          </Link>
        </div>
      </nav>

      <section className="max-w-5xl px-5 pt-12 pb-6 md:px-8 md:pt-16">
        <div className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#8447ff]">
          AI work memory · for engineering teams
        </div>
        <h1 className="mt-4 max-w-[16ch] text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-balance md:text-7xl">
          Taskforce <em className="not-italic text-[#8447ff]">remembers</em>{" "}
          what you and your team already did.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 text-pretty dark:text-zinc-300 md:text-lg">
          Taskforce captures decisions from Claude Code, Codex, and Cursor,
          stores them as searchable{" "}
          <b className="font-medium text-zinc-950 dark:text-white">documents</b>
          , and replays them as context to your next prompt. Engineers stop
          re-explaining the codebase to every new chat.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/signup"
            className="border border-zinc-950 bg-zinc-950 px-4 py-3 font-mono text-xs tracking-[0.04em] text-white dark:border-white dark:bg-white dark:text-zinc-950"
          >
            Start free →
          </Link>
          <Link
            to="/"
            className="border border-zinc-950 px-4 py-3 font-mono text-xs tracking-[0.04em] dark:border-white/30"
          >
            Watch 90s demo
          </Link>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            no credit card · works with claude code, codex, cursor, mcp
          </span>
        </div>
      </section>

      <section className="mx-5 mt-3 grid border-y border-zinc-300 md:mx-8 md:grid-cols-4 dark:border-white/15">
        {proofStats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-zinc-300 px-4 py-4 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 dark:border-white/15"
          >
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.17em] text-zinc-400 dark:text-zinc-500">
              {stat.label}
            </div>
            <div
              className={
                stat.compact
                  ? "mt-2 text-sm font-semibold"
                  : "mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums"
              }
            >
              {stat.value}
            </div>
            <div className="mt-1 font-mono text-[0.65rem] text-zinc-500 dark:text-zinc-400">
              {stat.sub}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
