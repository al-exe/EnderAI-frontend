import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"

import { listAgents } from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentCard } from "@/components/V2/Agents/AgentCard"

export const Route = createFileRoute("/v2/agents")({
  component: TaskforceAgents,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agents",
      },
    ],
  }),
})

function TaskforceAgents() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  return pathname === "/v2/agents" ? <AgentsIndex /> : <Outlet />
}

function AgentsIndex() {
  const { isDemoMode } = useDemoMode()
  const agentsQuery = useQuery({
    queryKey: ["v2-agents", isDemoMode],
    queryFn: () => listAgents({ demo: isDemoMode }),
  })
  const agents = agentsQuery.data?.items ?? []

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_28rem),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_30rem)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border bg-background/85 p-8 shadow-sm backdrop-blur">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Taskforce command center
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Reusable AI specialists
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Specialists package your best prior work into repeatable
              expertise: routing triggers, operating instructions, linked
              knowledge, and proof that reuse paid off.
            </p>
          </div>
        </section>

        {agentsQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : agents.length > 0 ? (
          <div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            data-testid="agents-grid"
          >
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <section className="rounded-[2rem] border border-dashed bg-background/80 p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold">No specialists yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              No specialists yet — Taskforce will create them as you accumulate
              context.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
