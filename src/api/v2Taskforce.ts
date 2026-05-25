import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface TaskforceSessionSavingsResponse {
  session_id: string
  doc_count: number
  net_saved_tokens: number
  usd_saved: string
  pricing_model_id: string
  occurred_at_first: string | null
  occurred_at_last: string | null
  specialist_slug: string | null
  specialist_name: string | null
}

export interface TaskforceSessionLogEntry {
  document_id: string
  title: string
  score: number
  confidence_band: "high" | "medium" | "low"
  match_reasons: string[]
  summary_markdown: string
  occurred_at: string
  query_id: string
  net_saved_tokens: number
}

export interface TaskforceSessionLogResponse {
  session_id: string
  entries: TaskforceSessionLogEntry[]
}

export interface ReadTaskforceSessionSavingsArgs {
  sessionId: string
  pricingModelId?: string
}

export function readTaskforceSessionSavings(
  args: ReadTaskforceSessionSavingsArgs,
): CancelablePromise<TaskforceSessionSavingsResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/session-savings",
    query: {
      session_id: args.sessionId,
      ...(args.pricingModelId ? { pricing_model_id: args.pricingModelId } : {}),
    },
  })
}

export interface ReadTaskforceSessionLogArgs {
  sessionId: string
  limit?: number
}

export function readTaskforceSessionLog(
  args: ReadTaskforceSessionLogArgs,
): CancelablePromise<TaskforceSessionLogResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/session-log",
    query: {
      session_id: args.sessionId,
      limit: args.limit ?? 50,
    },
  })
}
