import { BadgeCheck, Sparkles } from "lucide-react"

import type { AgentSpecialistDetail } from "@/api/v2Agents"
import { Badge } from "@/components/ui/badge"
import { formatCompactNumber } from "./formatters"

type Props = {
  agent: AgentSpecialistDetail
}

export function AgentHero({ agent }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.28),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(6,78,59,0.88))] p-8 text-white shadow-2xl">
      <div className="absolute right-8 top-8 hidden size-28 rounded-full border border-white/15 bg-white/10 blur-sm md:block" />
      <div className="relative max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/80">
          <Sparkles className="size-4" />
          Taskforce profile
        </div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          {agent.name}
        </h1>
        <p className="mt-3 text-lg font-medium text-emerald-100">
          {agent.role}
        </p>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/78">
          {agent.description}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {agent.domain_tags.map((tag) => (
            <Badge
              key={tag}
              className="border-white/20 bg-white/12 text-white hover:bg-white/18"
              variant="outline"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {formatCompactNumber(agent.stats.tokens_saved)}
            </div>
            <div className="text-sm text-white/65">tokens saved</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-2xl font-semibold tabular-nums">
              {agent.stats.invocations_count}
            </div>
            <div className="text-sm text-white/65">invocations</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
              <BadgeCheck className="size-5 text-emerald-200" />
              {agent.stats.linked_docs_count}
            </div>
            <div className="text-sm text-white/65">linked docs</div>
          </div>
        </div>
      </div>
    </section>
  )
}
