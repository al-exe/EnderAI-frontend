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

export interface TaskforceSessionActivityEntry {
  id: string
  occurred_at: string
  prompt: string
  response_summary: string | null
  ledger_href: string | null
}

export interface TaskforceSessionActivityResponse {
  session_id: string
  entries: TaskforceSessionActivityEntry[]
}

export interface TaskforceFleetAgent {
  session_id: string
  fleet_session_id: string
  cwd: string | null
  branch: string | null
  repo: string | null
  active_document_id: string | null
  referenced_document_ids: string[]
  title: string | null
  summary_markdown: string
  last_seen_at: string
  minutes_ago: number
  status: "running" | "waiting" | "paused" | "idle"
  started_at: string | null
  specialist_slug: string | null
  specialist_rule_count: number | null
  model_id: string | null
}

export interface TaskforceFleetSession {
  id: string
  name: string
  is_history: boolean
  created_at: string
  updated_at: string
  agents: TaskforceFleetAgent[]
}

export interface TaskforceFleetResponse {
  fleet_sessions: TaskforceFleetSession[]
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

export interface ReadTaskforceSessionActivityArgs {
  sessionId: string
  limit?: number
}

export function readTaskforceSessionActivity(
  args: ReadTaskforceSessionActivityArgs,
): CancelablePromise<TaskforceSessionActivityResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/session-activity",
    query: {
      session_id: args.sessionId,
      limit: args.limit ?? 50,
    },
  })
}

export function readTaskforceFleet(): CancelablePromise<TaskforceFleetResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/fleet",
  })
}

export function createTaskforceFleetSession(): CancelablePromise<TaskforceFleetSession> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/taskforce/fleet",
    body: {},
  })
}

export function updateTaskforceFleetSession(
  fleetSessionId: string,
  name: string,
): CancelablePromise<TaskforceFleetSession> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/taskforce/fleet/{fleet_session_id}",
    path: {
      fleet_session_id: fleetSessionId,
    },
    body: { name },
  })
}

export function deleteTaskforceFleetSession(
  fleetSessionId: string,
): CancelablePromise<void> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/v2/taskforce/fleet/{fleet_session_id}",
    path: {
      fleet_session_id: fleetSessionId,
    },
  })
}

export function assignTaskforceFleetSession(
  sessionId: string,
  fleetSessionId: string,
): CancelablePromise<TaskforceFleetAgent> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/taskforce/session/{session_id}",
    path: {
      session_id: sessionId,
    },
    body: {
      fleet_session_id: fleetSessionId,
    },
  })
}
