import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type { LedgerTranscriptEvent } from "./v2Ledger"

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

export interface TaskforceSessionActivityEntry extends LedgerTranscriptEvent {
  occurred_at: string
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
  active_document_id: string | null
  referenced_document_ids: string[]
  display_name: string
  title: string | null
  summary_markdown: string
  last_seen_at: string
  minutes_ago: number
  status: "running" | "waiting" | "paused" | "idle" | "inactive"
  recent_activity: string[]
  started_at: string | null
  specialist_slug: string | null
  specialist_rule_count: number | null
  model_id: string | null
  agent_kind: "claude" | "codex" | "cursor" | "other"
}

export interface TaskforceFleetSession {
  id: string
  name: string
  is_history: boolean
  is_default: boolean
  auto_archive_disabled: boolean
  created_at: string
  updated_at: string
  agents: TaskforceFleetAgent[]
}

export interface TaskforceFleetResponse {
  fleet_sessions: TaskforceFleetSession[]
}

export interface TaskforceSessionContextEntry {
  document_id: string
  title: string
  summary_markdown: string
  produced_by_client: string | null
  outcome: string | null
  last_touched_at: string | null
  token_cost: number
}

export interface TaskforceSessionContextResponse {
  fleet_session_id: string
  scope: string
  entry_count: number
  token_estimate: number
  inject_token_budget: number
  entries: TaskforceSessionContextEntry[]
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

export function readTaskforceFleetSessionContext(
  fleetSessionId: string,
): CancelablePromise<TaskforceSessionContextResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/fleet/{fleet_session_id}/context",
    path: {
      fleet_session_id: fleetSessionId,
    },
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

/** Mark a session group as the default that new agents join. */
export function setDefaultTaskforceFleetSession(
  fleetSessionId: string,
): CancelablePromise<TaskforceFleetSession> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/taskforce/fleet/{fleet_session_id}",
    path: {
      fleet_session_id: fleetSessionId,
    },
    body: { is_default: true },
  })
}

/** Toggle whether stale agents in this session group are auto-archived. */
export function setFleetSessionAutoArchiveDisabled(
  fleetSessionId: string,
  disabled: boolean,
): CancelablePromise<TaskforceFleetSession> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/taskforce/fleet/{fleet_session_id}",
    path: {
      fleet_session_id: fleetSessionId,
    },
    body: { auto_archive_disabled: disabled },
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

export function renameTaskforceSession(
  sessionId: string,
  displayName: string,
): CancelablePromise<TaskforceFleetAgent> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/taskforce/session/{session_id}",
    path: {
      session_id: sessionId,
    },
    body: {
      display_name: displayName,
    },
  })
}

export interface TaskforceSessionInboxMessage {
  id: string
  body: string
  created_at: string
  delivered_at: string | null
}

export interface TaskforceSessionInboxListResponse {
  session_id: string
  pending: TaskforceSessionInboxMessage[]
}

/** Pending (undelivered) queued prompts for an agent session. */
export function readTaskforceSessionInbox(
  sessionId: string,
): CancelablePromise<TaskforceSessionInboxListResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/session/{session_id}/inbox",
    path: {
      session_id: sessionId,
    },
  })
}

/**
 * Queue a prompt for an idle Claude/Codex agent. Its Stop hook claims and
 * re-injects the message as a fresh user turn the next time it goes idle.
 */
export function enqueueTaskforceSessionInbox(
  sessionId: string,
  body: string,
): CancelablePromise<TaskforceSessionInboxMessage> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/taskforce/session/{session_id}/inbox",
    path: {
      session_id: sessionId,
    },
    body: { body },
  })
}
