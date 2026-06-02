import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export type AgentSpecialistStatus = "active" | "draft" | "archived"

export interface AgentSpecialistSummary {
  id: string
  slug: string
  name: string
  role: string
  short_description: string
  domain_tags: string[]
  status: AgentSpecialistStatus
  created_from: string
  linked_docs_count: number
  invocations_count: number
  tokens_saved: number
  last_invoked_at: string | null
}

export interface AgentsListResponse {
  items: AgentSpecialistSummary[]
}

export interface AgentSpecialistLinkedDoc {
  document_id: string
  title: string
  description: string
  anchor_id: string | null
  href: string
  reason: string | null
}

export interface AgentSpecialistInvocationSummary {
  id: string
  prompt: string
  summary: string | null
  session_id: string | null
  repo: string | null
  branch: string | null
  documents_consulted_count: number
  tokens_saved: number
  created_at: string
}

export interface AgentSpecialistStats {
  invocations_count: number
  linked_docs_count: number
  tokens_saved: number
  usd_saved: string
}

export interface AgentSpecialistDetail {
  id: string
  slug: string
  name: string
  role: string
  description: string
  created_from: string
  domain_tags: string[]
  routing_triggers: string[]
  negative_triggers: string[]
  instructions: string[]
  linked_knowledge: AgentSpecialistLinkedDoc[]
  recent_invocations: AgentSpecialistInvocationSummary[]
  stats: AgentSpecialistStats
}

export function listAgents(
  options: { demo?: boolean } = {},
): CancelablePromise<AgentsListResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/agents",
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function getAgent(
  slug: string,
  options: { demo?: boolean } = {},
): CancelablePromise<AgentSpecialistDetail> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/agents/{slug}",
    path: {
      slug,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}
