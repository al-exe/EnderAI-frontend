import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ChevronDown, ChevronUp, Loader2, Pencil } from "lucide-react"
import { useState } from "react"

import {
  type AgentSpecialistDetail,
  type AgentSpecialistUpdate,
  type AgentsListResponse,
  deleteAgent,
  getAgent,
  updateAgent,
} from "@/api/v2Agents"
import { ApiError } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import { AgentDetailSkeleton } from "@/components/V2/Agents/AgentDetailSkeleton"
import { AgentStatusBadge } from "@/components/V2/Agents/AgentStatusBadge"
import {
  agentSummaryToDetailPlaceholder,
  findAgentSummaryInList,
} from "@/components/V2/Agents/agentDetailPlaceholder"
import {
  AGENT_BREADCRUMB_CLASS,
  AGENT_DESCRIPTION_CLASS,
  AGENT_DETAIL_AVATAR_CLASS,
  AGENT_DETAIL_NAME_CLASS,
  AGENT_DETAIL_SUBTITLE_CLASS,
  AGENT_PAGE_TITLE_CLASS,
  AGENT_ROUTE_CHIP_CLASS,
  AGENT_SECTION_META_CLASS,
  AGENT_SECTION_TITLE_CLASS,
  AGENT_STAT_LABEL_CLASS,
} from "@/components/V2/Agents/agentsTypography"
import { EditProfileDialog } from "@/components/V2/Agents/EditProfileDialog"
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/components/V2/Agents/formatters"
import { QueryErrorState } from "@/components/V2/QueryErrorState"
import {
  V2_PAGE_BODY,
  V2_PAGE_CONTENT,
  V2_PAGE_FRAME,
  V2_STICKY_HEADER_CLASS,
} from "@/components/V2/v2PageShell"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/v2/agents/$slug")({
  component: AgentDetailPage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Profile",
      },
    ],
  }),
})

const AGENTS_DETAIL_SHELL = V2_PAGE_BODY

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
          <div className={AGENT_STAT_LABEL_CLASS}>{row.key}</div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              row.primary ? "text-[#8447ff]" : "text-zinc-950 dark:text-white"
            }`}
          >
            {row.value}
          </div>
          <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
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
      <h2 className={AGENT_SECTION_TITLE_CLASS}>{title}</h2>
      {meta && <span className={AGENT_SECTION_META_CLASS}>{meta}</span>}
    </div>
  )
}

function Chips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className={`${AGENT_ROUTE_CHIP_CLASS} border-[#8447ff]/30 text-[#8447ff]`}
        >
          {value}
        </span>
      ))}
    </div>
  )
}

function Instructions({ instructions }: { instructions: string[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="pt-5">
      <SectionHeader
        title="Operating instructions"
        meta={`${instructions.length} rules`}
      />
      <div className="mt-3 border border-black/10 bg-zinc-50 dark:border-white/12 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 text-xs tracking-[0.01em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
          <span>system prompt</span>
          <span className="text-[#8447ff]">live</span>
        </div>
        <pre
          className={cn(
            "whitespace-pre-wrap px-3 py-3 text-sm leading-5 text-zinc-600 dark:text-zinc-300",
            !expanded && "max-h-36 overflow-hidden",
          )}
        >
          {instructions
            .map((instruction, index) => `${index + 1}. ${instruction}`)
            .join("\n")}
        </pre>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between border-t border-black/10 px-3 py-2 text-xs tracking-[0.01em] text-[#8447ff] transition-colors hover:bg-[#8447ff]/5 dark:border-white/12"
        >
          <span>{expanded ? "Collapse" : "Expand"}</span>
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>
    </section>
  )
}

function LinkedKnowledge({ agent }: { agent: AgentSpecialistDetail }) {
  return (
    <section className="pt-5">
      <SectionHeader
        title="Sessions & documents"
        meta={`${agent.recent_invocations.length} sessions · ${agent.linked_knowledge.length} documents`}
      />

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs tracking-[0.01em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
              <th className="py-2 pr-3 text-left font-medium">Session</th>
              <th className="px-3 text-left font-medium">Repo</th>
              <th className="px-3 text-right font-medium">Saved</th>
              <th className="py-2 pl-3 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {agent.recent_invocations.length === 0 ? (
              <tr className="border-b border-black/5 dark:border-white/10">
                <td
                  colSpan={4}
                  className="py-3 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No sessions yet.
                </td>
              </tr>
            ) : (
              agent.recent_invocations.map((invocation) => (
                <tr
                  key={invocation.id}
                  className="group relative cursor-pointer border-b border-black/5 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="py-3 pr-3 align-top text-sm text-zinc-950 dark:text-white">
                    {invocation.session_id && (
                      <Link
                        to="/v2/ledger"
                        search={{ session_id: invocation.session_id }}
                        aria-label={`Open session "${invocation.prompt}"`}
                        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      />
                    )}
                    <div className="font-semibold">"{invocation.prompt}"</div>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-zinc-500 dark:text-zinc-400">
                    {invocation.repo ?? "Taskforce"}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm font-semibold text-[#8447ff]">
                    +{formatCompactNumber(invocation.tokens_saved)}
                  </td>
                  <td className="py-3 pl-3 text-right align-top text-xs text-zinc-400 dark:text-zinc-500">
                    {formatRelativeTime(invocation.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs tracking-[0.01em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
              <th className="py-2 pr-3 text-left font-medium">Document</th>
              <th className="px-3 text-left font-medium">Anchor</th>
              <th className="py-2 px-3 text-right font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {agent.linked_knowledge.map((document) => (
              <tr
                key={`${document.document_id}-${document.anchor_id ?? "summary"}`}
                className="group relative cursor-pointer border-b border-black/5 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="py-3 pr-3 align-top">
                  <a
                    href={document.href}
                    className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <span className="sr-only">Open {document.title}</span>
                  </a>
                  <div className="text-base font-semibold text-zinc-950 dark:text-white">
                    {document.title}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {document.description}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-sm text-zinc-500 dark:text-zinc-400">
                  {document.anchor_id ?? "summary"}
                </td>
                <td className="px-3 py-3 text-right align-top text-xs text-zinc-500 dark:text-zinc-400">
                  {document.reason ?? "Pinned knowledge"}
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
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs tracking-[0.01em] text-zinc-400 dark:border-white/12 dark:text-zinc-500">
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
                className="group relative border-b border-black/5 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="relative py-3 pr-3 align-top text-sm text-zinc-800 dark:text-zinc-200">
                  {invocation.session_id && (
                    <Link
                      to="/v2/metrics"
                      search={{ session_id: invocation.session_id }}
                      aria-label={`Open metrics for "${invocation.prompt}"`}
                      className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    />
                  )}
                  "{invocation.prompt}"
                </td>
                <td className="px-3 py-3 align-top text-sm text-zinc-500 dark:text-zinc-400">
                  {invocation.repo ?? "Taskforce"}
                </td>
                <td className="px-3 py-3 text-right align-top text-sm font-semibold text-[#8447ff]">
                  +{formatCompactNumber(invocation.tokens_saved)}
                </td>
                <td className="py-3 pl-3 text-right align-top text-xs text-zinc-400 dark:text-zinc-500">
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [editOpen, setEditOpen] = useState(false)
  const updateMutation = useMutation({
    mutationFn: (values: AgentSpecialistUpdate) =>
      updateAgent(slug, values, { demo: isDemoMode }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["v2-agent", slug, isDemoMode], updated)
      queryClient.invalidateQueries({ queryKey: ["v2-agents", isDemoMode] })
      setEditOpen(false)
      showSuccessToast("Profile updated.")
    },
    onError: () => {
      showErrorToast("Could not update profile.")
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAgent(slug, { demo: isDemoMode }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["v2-agent", slug, isDemoMode] })
      queryClient.invalidateQueries({ queryKey: ["v2-agents", isDemoMode] })
      setEditOpen(false)
      showSuccessToast("Profile deleted.")
      navigate({ to: "/v2/agents" })
    },
    onError: () => {
      showErrorToast("Could not delete profile.")
    },
  })
  const agentQuery = useQuery({
    queryKey: ["v2-agent", slug, isDemoMode],
    queryFn: () => getAgent(slug, { demo: isDemoMode }),
    placeholderData: () => {
      const cached = queryClient.getQueryData<AgentSpecialistDetail>([
        "v2-agent",
        slug,
        isDemoMode,
      ])
      if (cached?.slug === slug) {
        return cached
      }

      const list = queryClient.getQueryData<AgentsListResponse>([
        "v2-agents",
        isDemoMode,
      ])
      const summary = findAgentSummaryInList(list, slug)
      return summary ? agentSummaryToDetailPlaceholder(summary) : undefined
    },
    retry: false,
  })
  const agent = agentQuery.data
  const isAgentError = agentQuery.isError
  const isAgentFetched = agentQuery.isFetched
  const isAgentFetching = agentQuery.isFetching
  const isAgentPending = agentQuery.isPending
  const isAgentPlaceholderData = agentQuery.isPlaceholderData
  const hasMatchingAgent = agent?.slug === slug
  const isAgentNotFound =
    agentQuery.error instanceof ApiError && agentQuery.error.status === 404
  const showNotFound =
    isAgentNotFound ||
    (!isAgentError && isAgentFetched && !isAgentFetching && !hasMatchingAgent)
  const showLoadError = isAgentError && !isAgentNotFound && !hasMatchingAgent
  const showFullSkeleton =
    !showNotFound &&
    !showLoadError &&
    !agent &&
    (isAgentPending || isAgentFetching)
  const isHydratingDetail =
    hasMatchingAgent && isAgentFetching && isAgentPlaceholderData

  if (showFullSkeleton) {
    return (
      <section
        className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
      >
        <AgentDetailSkeleton shellClassName={AGENTS_DETAIL_SHELL} />
      </section>
    )
  }

  if (showLoadError) {
    return (
      <section
        className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
      >
        <div className={V2_PAGE_CONTENT}>
          <QueryErrorState
            title="Could not load this profile"
            description="The profile service returned an unexpected error. Try again without reloading the page."
            onRetry={() => void agentQuery.refetch()}
            isRetrying={agentQuery.isFetching}
            testId="profile-detail-load-error"
          />
        </div>
      </section>
    )
  }

  if (showNotFound || !agent) {
    return (
      <section
        className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
      >
        <div
          className={`${V2_PAGE_CONTENT} min-h-[50vh] items-center justify-center text-center`}
        >
          <h1 className={AGENT_PAGE_TITLE_CLASS}>Profile not found</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            This profile is unavailable or you do not have access.
          </p>
          <Button asChild className="mt-6">
            <Link to="/v2/agents">Back to profiles</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
    >
      <div className={AGENTS_DETAIL_SHELL}>
        {isAgentError && (
          <QueryErrorState
            title="Profile details may be out of date"
            description="The latest profile details could not be loaded. The last available version is still shown."
            onRetry={() => void agentQuery.refetch()}
            isRetrying={agentQuery.isFetching}
            compact
            testId="profile-detail-refresh-error"
          />
        )}
        <header
          data-testid="agent-detail-sticky-header"
          className={cn(
            V2_STICKY_HEADER_CLASS,
            "grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end",
          )}
        >
          <div>
            <div className={AGENT_BREADCRUMB_CLASS}>
              <Link to="/v2/agents" className="hover:text-foreground">
                Profiles
              </Link>
              <span className="px-2 text-muted-foreground/50">/</span>
              <span className="text-foreground">{agent.slug}</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className={AGENT_DETAIL_AVATAR_CLASS}>
                {initials(agent.name)}
              </span>
              <h1 className={cn("min-w-0", AGENT_DETAIL_NAME_CLASS)}>
                {agent.name}
              </h1>
            </div>
            <p className={AGENT_DETAIL_SUBTITLE_CLASS}>
              <span className="font-semibold text-foreground">
                {agent.role}
              </span>
              <span> · profile playbook</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AgentStatusBadge status={agent.status} className="h-8 px-3" />
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 px-3 text-xs font-medium text-foreground transition-colors hover:bg-zinc-50 dark:border-white/12 dark:hover:bg-white/5"
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </button>
          </div>
        </header>

        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          agent={agent}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
          onDelete={() => deleteMutation.mutate()}
        />

        {agent.description ? (
          <p className={cn("max-w-3xl", AGENT_DESCRIPTION_CLASS)}>
            {agent.description}
          </p>
        ) : null}

        {isHydratingDetail ? (
          <AgentDetailSkeleton
            shellClassName={AGENTS_DETAIL_SHELL}
            hideHeader
          />
        ) : (
          <>
            <StatLine agent={agent} />

            <section className="pt-2">
              <SectionHeader title="Tags" />
              <div className="py-3">
                <Chips values={agent.routing_triggers} />
              </div>
            </section>

            <Instructions instructions={agent.instructions} />
            <LinkedKnowledge agent={agent} />
            <RecentInvocations agent={agent} />
          </>
        )}

        {agentQuery.isFetching && !isHydratingDetail && (
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Refreshing profile
          </div>
        )}
      </div>
    </section>
  )
}
