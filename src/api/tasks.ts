import { OpenAPI, type CancelablePromise } from "@/client"
import { request } from "@/client/core/request"

import type { ArtifactPublic } from "@/api/library"

export interface ThreadPublic {
  id: string
  title: string
  workflow_key: string
  goal: string | null
  acceptance_criteria: string | null
  systems_touched: Record<string, unknown>
  risk_level: string
  status: string
  created_at: string | null
  last_touched_at: string | null
}

export interface ThreadsPublic {
  data: ThreadPublic[]
  count: number
}

export interface ExecutionPublic {
  id: string
  thread_id: string
  targets: unknown[]
  started_at: string | null
  ended_at: string | null
  status: string
  summary: string | null
}

export interface ExecutionsPublic {
  data: ExecutionPublic[]
  count: number
}

export interface EventPublic {
  id: number
  execution_id: string
  ts: string | null
  type: string
  message: string | null
  data: Record<string, unknown>
  supersedes_event_id: number | null
}

export type ExecutionArtifactRelation =
  | "used"
  | "created"
  | "promoted"
  | "superseded"

export interface ExecutionArtifactLinkPublic {
  relation: ExecutionArtifactRelation
  created_at: string | null
  artifact: ArtifactPublic
}

export interface ExecutionDetailPublic {
  execution: ExecutionPublic
  thread: ThreadPublic
  events: EventPublic[]
  artifact_links: ExecutionArtifactLinkPublic[]
}

export interface ReadThreadsParams {
  workflow_key?: string
  status?: string
  q?: string
  skip?: number
  limit?: number
}

export interface ReadExecutionsParams {
  thread_id?: string
  status?: string
  skip?: number
  limit?: number
}

export function readThreads(
  params: ReadThreadsParams = {},
): CancelablePromise<ThreadsPublic> {
  const workflow_key = params.workflow_key?.trim() || undefined
  const status = params.status?.trim() || undefined
  const q = params.q?.trim() || undefined

  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/threads/",
    query: {
      workflow_key,
      status,
      q,
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readExecutions(
  params: ReadExecutionsParams = {},
): CancelablePromise<ExecutionsPublic> {
  const thread_id = params.thread_id?.trim() || undefined
  const status = params.status?.trim() || undefined

  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/executions/",
    query: {
      thread_id,
      status,
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readThreadExecutions(
  threadId: string,
  params: { skip?: number; limit?: number } = {},
): CancelablePromise<ExecutionsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/threads/{thread_id}/executions",
    path: {
      thread_id: threadId,
    },
    query: {
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readExecutionDetail(
  executionId: string,
): CancelablePromise<ExecutionDetailPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/executions/{execution_id}/detail",
    path: {
      execution_id: executionId,
    },
  })
}


export interface ThreadTitleUpdate {
  title: string
}

export function updateThreadTitle(
  threadId: string,
  body: ThreadTitleUpdate,
): CancelablePromise<ThreadPublic> {
  const title = body.title.trim()

  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/threads/{thread_id}",
    path: {
      thread_id: threadId,
    },
    body: {
      title,
    },
  })
}
