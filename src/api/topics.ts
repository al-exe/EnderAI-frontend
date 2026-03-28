import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface TopicRollupPublic {
  brief: string | null
  canonical_files: string[]
  canonical_symbols: string[]
  canonical_errors: string[]
  canonical_symptoms: string[]
  pinned_takeaways: string[]
  negative_history: string[]
  representative_case_ids: string[]
  aliases: string[]
  vocabulary: string[]
  ambiguity_notes: string[]
  open_questions: string[]
  case_count: number
  recent_case_ids: string[]
  updated_at: string | null
}

export interface TopicPublic {
  id: string
  title: string
  slug: string
  description: string | null
  aliases: string[]
  status: string
  workflow_key: string
  owner_ids: string[]
  created_at: string | null
  updated_at: string | null
  last_used_at: string | null
  rollup_summary: string | null
  rollup_version: number
  canonical_files: string[]
  canonical_symbols: string[]
  canonical_errors: string[]
  canonical_symptoms: string[]
  pinned_takeaways: string[]
  ambiguity_notes: string[]
  open_questions: string[]
  negative_history: string[]
  representative_case_ids: string[]
  recent_case_ids: string[]
  vocabulary: string[]
  case_count: number
}

export interface TopicsPublic {
  data: TopicPublic[]
  count: number
}

export interface ReadTopicsParams {
  status?: string
  q?: string
  workflow_key?: string
  skip?: number
  limit?: number
  demo?: boolean
}

export function readTopics(
  params: ReadTopicsParams = {},
): CancelablePromise<TopicsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/topics/",
    query: {
      status: params.status?.trim() || undefined,
      q: params.q?.trim() || undefined,
      workflow_key: params.workflow_key?.trim() || undefined,
      skip: params.skip,
      limit: params.limit,
      demo: params.demo || undefined,
    },
  })
}

export function readTopic(
  topicId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<TopicPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/topics/{topic_id}",
    path: {
      topic_id: topicId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function readTopicRollup(
  topicId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<TopicRollupPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/topics/{topic_id}/rollup",
    path: {
      topic_id: topicId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export interface TopicUpdate {
  title?: string
  description?: string | null
}

export function updateTopic(
  topicId: string,
  body: TopicUpdate,
  options: { demo?: boolean } = {},
): CancelablePromise<TopicPublic> {
  const title = body.title?.trim()
  const description =
    typeof body.description === "string"
      ? body.description.trim() || null
      : body.description

  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/topics/{topic_id}",
    path: {
      topic_id: topicId,
    },
    query: {
      demo: options.demo || undefined,
    },
    body: {
      ...(title !== undefined ? { title } : {}),
      ...(body.description !== undefined ? { description } : {}),
    },
  })
}
