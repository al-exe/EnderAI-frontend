import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

/**
 * TF-202 / C3 — cross-boundary reuse read client.
 *
 * GET /v2/taskforce/cross-boundary-reuse — the empty-cell proof's data layer.
 * Hand-written wrapper (like the other src/api/v2*.ts modules) until the next
 * `npm run generate-client` run picks the endpoint up from the OpenAPI spec.
 *
 * Decimal fields (`usd_amount`, `estimated_usd_total`) arrive as strings from
 * the backend (Pydantic), matching how v2Taskforce types `usd_saved`.
 */

export interface CrossBoundaryReuseEvent {
  event_id: string
  kind: string
  occurred_at: string
  document_id: string
  document_title: string
  document_href: string
  produced_by_client: string | null
  consumed_by_client: string | null
  owner_id: string
  owner_name: string
  consumer_id: string
  consumer_name: string
  net_saved_tokens: number
  usd_amount: string
  usd_is_estimated: boolean
  specialist_slug: string | null
  specialist_name: string | null
  session_id: string | null
  query_id: string | null
  match_reasons: string[]
  score: number | null
  confidence_band: string | null
}

export interface CrossBoundaryReuseResponse {
  scope: "organization"
  organization_id: string | null
  proven_event_count: number
  proven_net_saved_tokens: number
  estimated_usd_total: string
  events: CrossBoundaryReuseEvent[]
}

export interface ReadCrossBoundaryReuseArgs {
  demo?: boolean
  limit?: number
}

export function readCrossBoundaryReuse(
  args: ReadCrossBoundaryReuseArgs = {},
): CancelablePromise<CrossBoundaryReuseResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/taskforce/cross-boundary-reuse",
    query: {
      demo: args.demo || undefined,
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
    },
  })
}
