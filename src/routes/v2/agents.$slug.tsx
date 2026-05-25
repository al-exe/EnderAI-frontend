import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowUpRight, Copy, Loader2 } from "lucide-react"

import { type AgentSpecialistDetail, getAgent } from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import { AgentDetailSkeleton } from "@/components/V2/Agents/AgentDetailSkeleton"
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/components/V2/Agents/formatters"
import { V2_CONTENT_SHELL, V2_PAGE_FRAME } from "@/components/V2/v2PageShell"

export const Route = createFileRoute("/v2/agents/$slug")({
  component: AgentDetailPage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agent Specialist",
      },
    ],
  }),
})

const AGENTS_DETAIL_SHELL = `${V2_CONTENT_SHELL} gap-6 py-6`

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function StatLine({ agent }: { agent: AgentSpecialistDetail }) {
  const rows = [
    {
      key: "Tokens saved",
      value: formatCompactNumber(agent.stats.tokens_saved),
      sub: `across ${agent.stats.invocations_count} invocations`,
      primary: true,
    },
    {
      key: "Reuse rate",
      value:
        agent.stats.linked_docs_count > 0
          ? `${Math.min(
              99,
              Math.round(
                (agent.stats.invocations_count /
                  agent.stats.linked_docs_count) *
                  100,
              ),
            )}%`
          : "0%",
      sub: "routes that fired vs. matched",
    },
    {
      key: "Linked docs",
      value: agent.stats.linked_docs_count.toLocaleString(),
      sub: `${agent.linked_knowledge.length} visible to you`,
    },
    {
      key: "Last invoked",
      value: agent.recent_invocations[0]
        ? formatRelativeTime(agent.recent_invocations[0].created_at)
        : "Never",
      sub: agent.recent_invocations[0]?.branch ?? "waiting for first run",
    },
  ]

  return (
    <section className="my-4 grid border border-black/10 bg-white sm:grid-cols-2 lg:grid-cols-4 dark:border-white/12 dark:bg-zinc-950">
      {rows.map((row) => (
        <div
          key={row.key}
          className="border-b border-black/10 p-4 last:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0 dark:border-white/12"
        >
          <div className="font-mono text-[0.775rem] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
            {row.key}
          </div>
          <div
            className={`mt-1 text-[1.5625rem] font-semibold leading-tight tracking-[-0.015em] tabular-nums ${
              row.primary ? "text-[#8447ff]" : "text-zinc-950 dark:text-white"
            }`}
          >
            {row.value}
          </div>
          <div className="mt-1 truncate font-mono text-[0.775rem] text-zinc-500 dark:text-zinc-400">
            {row.sub}
          </div>
        </div>
      ))}
    </section>
  )
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/10 pb-2 dark:border-white/12">
      <h2 className="font-mono text-[0.825rem] font-semibold uppercase tracking-[0.18em] text-zinc-950 dark:text-white">
        {title}
      </h2>
      {meta && (
        <span className="font-mono text-[0.775rem] tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
          {meta}
        </span>
      )}
    </div>
  )
}

function Chips({
  values,
  variant = "positive",
}: {
  values: string[]
  variant?: "positive" | "negative"
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className={`border px-2 py-1 font-mono text-[0.85rem] ${
            variant === "negative"
              ? "border-zinc-200 text-zinc-500 line-through dark:border-white/10 dark:text-zinc-500"
              : "border-[#8447ff]/30 text-[#8447ff]"
          }`}
        >
          {value}
        </span>
      ))}
    </div>
  )
}

function Instructions({ instructions }: { instructions: string[] }) {
  return (
    <section className="pt-5">
      <SectionHeader
        title="Operating instructions"
        meta={`${instructions.length} rules`}
      />
      <div className="mt-3 border border-black/10 bg-zinc-50 dark:border-white/12 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 font-mono text-[0.775rem] uppercase tracking-[0.14em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
          <span>system prompt</span>
          <span className="text-[#8447ff]">live</span>
        </div>
        <pre className="max-h-36 overflow-hidden whitespace-pre-wrap px-3 py-3 font-mono text-[0.9rem] leading-7 text-zinc-800 dark:text-zinc-200">
          {instructions
            .map((instruction, index) => `${index + 1}. ${instruction}`)
            .join("\n")}
        </pre>
        <div className="flex items-center justify-between border-t border-black/10 px-3 py-2 font-mono text-[0.8125rem] uppercase tracking-[0.08em] text-[#8447ff] dark:border-white/12">
          <span>Expand</span>
          <Copy className="size-4" />
        </div>
      </div>
    </section>
  )
}

function LinkedKnowledge({ agent }: { agent: AgentSpecialistDetail }) {
  return (
    <section className="pt-5">
      <SectionHeader
        title="Linked knowledge"
        meta={`${agent.linked_knowledge.length} documents`}
      />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-[1.09375rem]">
          <thead>
            <tr className="border-b border-black/10 font-mono text-[0.775rem] uppercase tracking-[0.12em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
              <th className="py-2 pr-3 text-left font-medium">Document</th>
              <th className="px-3 text-left font-medium">Anchor</th>
              <th className="px-3 text-right font-medium">Reason</th>
              <th className="py-2 pl-3 text-right font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {agent.linked_knowledge.map((document) => (
              <tr
                key={`${document.document_id}-${document.anchor_id ?? "summary"}`}
                className="border-b border-black/5 dark:border-white/10"
              >
                <td className="py-3 pr-3 align-top">
                  <div className="font-medium text-zinc-950 dark:text-white">
                    {document.title}
                  </div>
                  <div className="mt-1 line-clamp-1 text-[0.9375rem] text-zinc-500 dark:text-zinc-400">
                    {document.description}
                  </div>
                </td>
                <td className="px-3 py-3 align-top font-mono text-[0.9375rem] text-zinc-500 dark:text-zinc-400">
                  {document.anchor_id ?? "summary"}
                </td>
                <td className="px-3 py-3 text-right align-top text-[0.9375rem] text-zinc-500 dark:text-zinc-400">
                  {document.reason ?? "Pinned knowledge"}
                </td>
                <td className="py-3 pl-3 text-right align-top">
                  <a
                    href={document.href}
                    className="inline-flex items-center justify-end gap-1 font-mono text-[0.9375rem] uppercase tracking-[0.08em] text-[#8447ff]"
                  >
                    Open
                    <ArrowUpRight className="size-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RecentInvocations({ agent }: { agent: AgentSpecialistDetail }) {
  return (
    <section className="pt-5">
      <SectionHeader
        title="Recent invocations"
        meta={`last ${agent.recent_invocations.length} runs`}
      />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-[1.09375rem]">
          <thead>
            <tr className="border-b border-black/10 font-mono text-[0.775rem] uppercase tracking-[0.12em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
              <th className="py-2 pr-3 text-left font-medium">Query</th>
              <th className="px-3 text-left font-medium">Repo</th>
              <th className="px-3 text-right font-medium">Saved</th>
              <th className="py-2 pl-3 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {agent.recent_invocations.map((invocation) => (
              <tr
                key={invocation.id}
                className="border-b border-black/5 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="py-3 pr-3 align-top font-mono text-[0.9375rem] text-zinc-800 dark:text-zinc-200">
                  {invocation.session_id ? (
                    <Link
                      to="/v2/metrics"
                      search={{ session_id: invocation.session_id }}
                      className="hover:text-[#8447ff]"
                    >
                      "{invocation.prompt}"
                    </Link>
                  ) : (
                    `"${invocation.prompt}"`
                  )}
                </td>
                <td className="px-3 py-3 align-top font-mono text-[0.9375rem] text-zinc-500 dark:text-zinc-400">
                  {invocation.repo ?? "Taskforce"}
                </td>
                <td className="px-3 py-3 text-right align-top font-mono text-[0.9375rem] font-semibold text-[#8447ff]">
                  +{formatCompactNumber(invocation.tokens_saved)}
                </td>
                <td className="py-3 pl-3 text-right align-top font-mono text-[0.9375rem] text-zinc-400 dark:text-zinc-500">
                  {formatRelativeTime(invocation.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AgentDetailPage() {
  const { slug } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const agentQuery = useQuery({
    queryKey: ["v2-agent", slug, isDemoMode],
    queryFn: () => getAgent(slug, { demo: isDemoMode }),
  })
  const agent = agentQuery.data
  const showSkeleton =
    agentQuery.isPending ||
    (agentQuery.isFetching && (!agent || agent.slug !== slug))

  if (showSkeleton) {
    return (
      <section
        className={`${V2_PAGE_FRAME} bg-white font-sans dark:bg-zinc-950`}
      >
        <AgentDetailSkeleton shellClassName={AGENTS_DETAIL_SHELL} />
      </section>
    )
  }

  if (!agent) {
    return (
      <section
        className={`${V2_PAGE_FRAME} bg-white font-sans dark:bg-zinc-950`}
      >
        <div
          className={`${V2_CONTENT_SHELL} flex min-h-[50vh] flex-col items-center justify-center py-12 text-center`}
        >
          <h1 className="text-[2.34375rem] font-semibold">Specialist not found</h1>
          <p className="mt-3 max-w-lg text-[1.09375rem] text-zinc-500 dark:text-zinc-400">
            This specialist is unavailable or you do not have access.
          </p>
          <Button asChild className="mt-6">
            <Link to="/v2/agents">Back to agents</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`${V2_PAGE_FRAME} bg-white font-sans text-zinc-950 dark:bg-zinc-950 dark:text-white`}
    >
      <div className={AGENTS_DETAIL_SHELL}>
        <header className="grid gap-4 border-b border-black/10 pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end dark:border-white/12">
          <div>
            <div className="font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              <Link
                to="/v2/agents"
                className="hover:text-zinc-950 dark:hover:text-white"
              >
                Agents
              </Link>
              <span className="px-2 text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-zinc-950 dark:text-white">
                {agent.slug}
              </span>
            </div>
            <h1 className="mt-2 inline-flex items-center gap-3 text-[2.34375rem] font-semibold leading-tight tracking-[-0.025em]">
              <span className="grid size-9 place-items-center bg-[#8447ff] font-mono text-base font-bold text-white">
                {initials(agent.name)}
              </span>
              {agent.name}
            </h1>
            <p className="mt-2 text-[1.09375rem] text-zinc-500 dark:text-zinc-400">
              <b className="font-medium text-zinc-950 dark:text-white">
                {agent.role}
              </b>{" "}
              · specialist playbook
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 border border-black/10 px-3 font-mono text-[0.8125rem] uppercase tracking-[0.1em] text-emerald-600 dark:border-white/12 dark:text-emerald-400">
              <span className="size-2 bg-emerald-500" />
              Active
            </span>
            <Button
              asChild
              variant="outline"
              className="h-9 px-3 font-mono text-[0.8125rem] uppercase tracking-[0.08em]"
            >
              <Link to="/v2/agents">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
          </div>
        </header>

        <StatLine agent={agent} />

        <section className="pt-2">
          <SectionHeader
            title="Routing rules"
            meta="Fires when triggers match and negative triggers miss"
          />
          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <div className="font-mono text-[0.85rem] text-zinc-400 dark:text-zinc-500">
                <b className="font-medium text-zinc-950 dark:text-white">
                  route_when:
                </b>
              </div>
              <Chips values={agent.routing_triggers} />
            </div>
            {agent.negative_triggers.length > 0 && (
              <div className="space-y-2">
                <div className="font-mono text-[0.85rem] text-zinc-400 dark:text-zinc-500">
                  <b className="font-medium text-zinc-950 dark:text-white">
                    do_not_route_when:
                  </b>
                </div>
                <Chips values={agent.negative_triggers} variant="negative" />
              </div>
            )}
          </div>
        </section>

        <Instructions instructions={agent.instructions} />
        <LinkedKnowledge agent={agent} />
        <RecentInvocations agent={agent} />

        {agentQuery.isFetching && (
          <div className="mt-5 inline-flex items-center gap-2 font-mono text-[0.9375rem] text-zinc-400 dark:text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Refreshing specialist
          </div>
        )}
      </div>
    </section>
  )
}
