import type {
  AgentSpecialistDetail,
  AgentSpecialistSummary,
  AgentsListResponse,
} from "@/api/v2Agents"

export function agentSummaryToDetailPlaceholder(
  summary: AgentSpecialistSummary,
): AgentSpecialistDetail {
  return {
    id: summary.id,
    slug: summary.slug,
    name: summary.name,
    role: summary.role,
    description: summary.short_description,
    domain_tags: summary.domain_tags,
    routing_triggers: summary.domain_tags,
    negative_triggers: [],
    instructions: [],
    linked_knowledge: [],
    recent_invocations: [],
    stats: {
      invocations_count: summary.invocations_count,
      linked_docs_count: summary.linked_docs_count,
      tokens_saved: summary.tokens_saved,
      usd_saved: "0",
    },
  }
}

export function findAgentSummaryInList(
  list: AgentsListResponse | undefined,
  slug: string,
) {
  return list?.items.find((item) => item.slug === slug)
}
