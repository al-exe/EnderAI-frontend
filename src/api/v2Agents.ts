import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export type AgentSpecialistStatus = "active" | "draft" | "archived" | "proposed"
export type AgentPermissionScope = "readonly" | "full"
export type AgentHarnessTarget = "claude" | "codex" | "cursor"
export type AgentHarnessTargetOption = AgentHarnessTarget | "all"

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
  created_at: string | null
}

export interface AgentsListResponse {
  items: AgentSpecialistSummary[]
}

export interface AgentSpecialistCreate {
  name: string
  role: string
  short_description?: string
  domain_tags?: string[]
}

export interface AgentSpecialistUpdate {
  name?: string
  role?: string
  short_description?: string
  domain_tags?: string[]
  status?: AgentSpecialistStatus
  model_hint?: string
  permission_scope?: AgentPermissionScope
  instructions?: string[]
  routing_triggers?: string[]
  negative_triggers?: string[]
}

export interface AgentSpecialistDocumentLinkCreate {
  document_id: string
  reason?: string
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

export interface AgentHarnessSyncFile {
  target: AgentHarnessTarget
  path: string
  content: string
  sha256: string
}

export interface AgentHarnessSyncResponse {
  priority: AgentHarnessTarget[]
  files: AgentHarnessSyncFile[]
}

export interface AgentSpecialistDetail {
  id: string
  slug: string
  name: string
  role: string
  status: AgentSpecialistStatus
  short_description: string
  description: string
  created_from: string
  model_hint: string
  permission_scope: AgentPermissionScope
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

export function createAgent(
  body: AgentSpecialistCreate,
  options: { demo?: boolean } = {},
): CancelablePromise<AgentSpecialistDetail> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/agents",
    query: {
      demo: options.demo || undefined,
    },
    body,
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

export function updateAgent(
  slug: string,
  body: AgentSpecialistUpdate,
  options: { demo?: boolean } = {},
): CancelablePromise<AgentSpecialistDetail> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/agents/{slug}",
    path: {
      slug,
    },
    query: {
      demo: options.demo || undefined,
    },
    body,
  })
}

export function deleteAgent(
  slug: string,
  options: { demo?: boolean } = {},
): CancelablePromise<void> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/v2/agents/{slug}",
    path: {
      slug,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function linkAgentDocument(
  slug: string,
  body: AgentSpecialistDocumentLinkCreate,
  options: { demo?: boolean } = {},
): CancelablePromise<AgentSpecialistDetail> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/agents/{slug}/documents",
    path: {
      slug,
    },
    query: {
      demo: options.demo || undefined,
    },
    body,
  })
}

export function unlinkAgentDocument(
  slug: string,
  documentId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<AgentSpecialistDetail> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/v2/agents/{slug}/documents/{document_id}",
    path: {
      slug,
      document_id: documentId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function syncAgentHarness(
  slug: string,
  options: { target?: AgentHarnessTargetOption; demo?: boolean } = {},
): CancelablePromise<AgentHarnessSyncResponse> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/agents/{slug}/sync-harness",
    path: {
      slug,
    },
    query: {
      target: options.target || undefined,
      demo: options.demo || undefined,
    },
  })
}
