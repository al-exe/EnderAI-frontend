import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

/**
 * TF-208 / pipeline-surfaces P1 — org session ledger.
 *
 * GET /v2/taskforce/ledger — the raw tier of the pipeline: a paginated,
 * org-scoped feed of sessions grouped from real metrics events. Hand-written
 * wrapper (like the other src/api/v2*.ts modules) until the next
 * `npm run generate-client` run picks the endpoint up from the OpenAPI spec.
 *
 * Decimal `usd_amount` arrives as a string from the backend (Pydantic),
 * matching how v2Taskforce types `usd_saved`.
 */

export interface LedgerDocRef {
  document_id: string
  title: string
  href: string
  state?: "fresh" | "stale" | "new" | "unknown"
}

export type LedgerTranscriptEventKind =
  | "prompt"
  | "reply"
  | "command"
  | "edit"
  | "note"

export interface LedgerTranscriptEvent {
  id: string
  kind: LedgerTranscriptEventKind
  occurred_at: string | null
  role: string | null
  who: string | null
  text: string | null
  cmd: string | null
  exit_code: number | null
  output: string | null
  file: string | null
  added: number | null
  removed: number | null
  note: string | null
  repo: string | null
}

export interface LedgerSessionRow {
  session_id: string
  actor_id: string
  actor_name: string
  client: string | null
  specialist_slug: string | null
  specialist_name: string | null
  specialist_href: string | null
  documents: LedgerDocRef[]
  kinds: string[]
  net_saved_tokens: number
  usd_amount: string
  event_count: number
  cross_boundary: boolean
  occurred_at_first: string
  occurred_at_last: string
  title: string | null
  short_session_id: string | null
  actor_handle: string | null
  harness_label: string | null
  harness_version: string | null
  model_id: string | null
  repo: string | null
  branch: string | null
  cwd: string | null
  started_at: string | null
  ended_at: string | null
  duration_ms: number
  imported_at: string | null
  message_count: number
  command_count: number
  edit_count: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  source: string | null
  transcript_available: boolean
  document_relationship?: "produced" | "reused" | "touched" | null
  session_href?: string | null
}

export interface LedgerSessionDetail extends LedgerSessionRow {
  transcript_events: LedgerTranscriptEvent[]
  raw_transcript_available: boolean
  source_metadata: Record<string, unknown>
}

export interface LedgerRawTranscript {
  session_id: string
  events: Record<string, unknown>[]
}

export interface LedgerResponse {
  scope: "organization"
  organization_id: string | null
  total: number
  limit: number
  offset: number
  rows: LedgerSessionRow[]
}

export interface ReadLedgerArgs {
  demo?: boolean
  actorId?: string
  client?: string
  specialist?: string
  crossBoundary?: boolean
  since?: string
  until?: string
  q?: string
  sort?: "newest" | "oldest"
  limit?: number
  offset?: number
}

export function readLedger(
  args: ReadLedgerArgs = {},
): CancelablePromise<LedgerResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/ledger",
    query: {
      demo: args.demo || undefined,
      actor_id: args.actorId || undefined,
      client: args.client || undefined,
      specialist: args.specialist || undefined,
      cross_boundary: args.crossBoundary || undefined,
      since: args.since || undefined,
      until: args.until || undefined,
      q: args.q || undefined,
      sort: args.sort || undefined,
      limit: args.limit ?? undefined,
      offset: args.offset ?? undefined,
    },
  })
}

export function readLedgerSessionDetail(
  sessionId: string,
  args: Pick<ReadLedgerArgs, "demo"> = {},
): CancelablePromise<LedgerSessionDetail> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/ledger/{session_id}",
    path: {
      session_id: sessionId,
    },
    query: {
      demo: args.demo || undefined,
    },
  })
}

export function readLedgerRawTranscript(
  sessionId: string,
  args: Pick<ReadLedgerArgs, "demo"> = {},
): CancelablePromise<LedgerRawTranscript> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/ledger/{session_id}/raw-transcript",
    path: {
      session_id: sessionId,
    },
    query: {
      demo: args.demo || undefined,
    },
  })
}

export function readDocumentLedgerSessions(
  documentId: string,
  args: Pick<ReadLedgerArgs, "demo" | "limit" | "offset"> = {},
): CancelablePromise<LedgerResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/documents/{document_id}/sessions",
    path: {
      document_id: documentId,
    },
    query: {
      demo: args.demo || undefined,
      limit: args.limit ?? undefined,
      offset: args.offset ?? undefined,
    },
  })
}
