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
      limit: args.limit ?? undefined,
      offset: args.offset ?? undefined,
    },
  })
}
