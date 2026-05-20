/**
 * Hand-rolled SSE client for POST /api/v1/v2/search.
 *
 * The auto-generated openapi-ts client wraps axios and has no notion
 * of streaming responses, so Search talks to the backend through this
 * helper instead. We use the Streams API rather than `EventSource`
 * because EventSource only supports GET; we need POST for the query
 * body.
 */

import { OpenAPI } from "@/client"

export type SearchTokenEvent = { kind: "token"; text: string }
export type SearchCitationEvent = {
  kind: "citation"
  source_kind: string
  source_item_id: string
  chunk_anchor_id: string
  title: string
  url_path: string
  score: number
}
export type SearchDoneEvent = {
  kind: "done"
  billed_to: "managed" | "byok:anthropic" | "byok:openai"
  model_id: string
  tokens_consumed: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_creation_tokens: number
  }
}
export type SearchErrorEvent = {
  kind: "error"
  code: string
  message: string
}
export type SearchEvent =
  | SearchTokenEvent
  | SearchCitationEvent
  | SearchDoneEvent
  | SearchErrorEvent

export interface StreamSearchArgs {
  query: string
  top_k?: number
  demo?: boolean
  signal?: AbortSignal
}

function resolveBaseUrl(): string {
  // OpenAPI.BASE is the client base URL configured in main.tsx. Falls
  // back to the relative path so dev/test contexts still work.
  return OpenAPI.BASE ?? ""
}

async function resolveAuthHeader(): Promise<Record<string, string>> {
  const token = OpenAPI.TOKEN
  if (!token) return {}
  // The OpenAPI token resolver accepts a request-options object; we
  // pass a minimal stub since the resolver in our client only reads
  // the localStorage-backed access token regardless of the request.
  const stub = { method: "POST" as const, url: "/api/v1/v2/search" }
  const value =
    typeof token === "function" ? await Promise.resolve(token(stub)) : token
  return value ? { Authorization: `Bearer ${value}` } : {}
}

/**
 * Parses a Server-Sent Events stream from a Response body. Yields one
 * `SearchEvent` per `event:` block. Stops when the stream ends or the
 * signal fires.
 */
export async function* streamSearch(
  args: StreamSearchArgs,
): AsyncGenerator<SearchEvent> {
  const base = resolveBaseUrl()
  const url = `${base}/api/v1/v2/search`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(await resolveAuthHeader()),
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: args.query,
      top_k: args.top_k,
      demo: args.demo ?? false,
    }),
    signal: args.signal,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload = await response.json()
      detail = payload?.detail ?? detail
    } catch {
      /* response body may not be JSON */
    }
    yield {
      kind: "error",
      code: `http_${response.status}`,
      message: String(detail),
    }
    return
  }

  if (!response.body) {
    yield { kind: "error", code: "no_body", message: "Empty response body." }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE messages are separated by blank lines. Split greedily on
    // "\n\n" so we yield each complete message as it arrives.
    let nl: number
    while ((nl = buffer.indexOf("\n\n")) !== -1) {
      const rawMessage = buffer.slice(0, nl)
      buffer = buffer.slice(nl + 2)
      const event = parseSseMessage(rawMessage)
      if (event) yield event
    }
  }
}

function parseSseMessage(raw: string): SearchEvent | null {
  let eventName = ""
  let dataLines: string[] = []
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim()
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart())
    }
  }
  if (!eventName || dataLines.length === 0) return null
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(dataLines.join("\n"))
  } catch {
    return null
  }
  return { kind: eventName, ...payload } as SearchEvent
}
