import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { getAgent } from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentHero } from "@/components/V2/Agents/AgentHero"
import { AgentInstructions } from "@/components/V2/Agents/AgentInstructions"
import { AgentInvocations } from "@/components/V2/Agents/AgentInvocations"
import { AgentLinkedKnowledge } from "@/components/V2/Agents/AgentLinkedKnowledge"
import { AgentStatsRail } from "@/components/V2/Agents/AgentStatsRail"
import { RoutingSignals } from "@/components/V2/Agents/RoutingSignals"

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

function AgentDetailPage() {
  const { slug } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const agentQuery = useQuery({
    queryKey: ["v2-agent", slug, isDemoMode],
    queryFn: () => getAgent(slug, { demo: isDemoMode }),
  })
  const agent = agentQuery.data

  if (agentQuery.isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 md:px-8">
        <Skeleton className="h-80 rounded-[2rem]" />
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </main>
    )
  }

  if (!agent) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-16 text-center">
        <h1 className="text-3xl font-semibold">Specialist not found</h1>
        <p className="mt-3 text-muted-foreground">
          This specialist is unavailable or you do not have access.
        </p>
        <Button asChild className="mt-6">
          <Link to="/v2/agents">Back to agents</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_30rem)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 md:px-8">
        <Button asChild variant="ghost" className="w-fit">
          <Link to="/v2/agents">
            <ArrowLeft className="size-4" />
            Back to agents
          </Link>
        </Button>
        <AgentHero agent={agent} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <AgentInstructions instructions={agent.instructions} />
            <RoutingSignals
              routingTriggers={agent.routing_triggers}
              negativeTriggers={agent.negative_triggers}
            />
            <AgentLinkedKnowledge documents={agent.linked_knowledge} />
            <AgentInvocations invocations={agent.recent_invocations} />
          </div>
          <AgentStatsRail stats={agent.stats} />
        </div>
      </div>
    </main>
  )
}
