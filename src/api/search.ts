import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface SearchRouteSearch {
  topicId?: string | null
  caseId?: string | null
  skillId?: string | null
  sessionId?: string | null
  documentId?: string | null
  slug?: string | null
}

export interface SearchHitPublic {
  kind:
    | "topic"
    | "case"
    | "skill"
    | "session"
    | "profile"
    | "document"
    | "ledger"
  id: string
  title: string
  subtitle: string | null
  excerpt: string | null
  updated_at: string | null
  route: string
  href: string
  route_search: SearchRouteSearch
}

export interface SearchResultsPublic {
  topics: SearchHitPublic[]
  cases: SearchHitPublic[]
  skills: SearchHitPublic[]
  sessions: SearchHitPublic[]
  profiles: SearchHitPublic[]
  documents: SearchHitPublic[]
  ledger: SearchHitPublic[]
  topic_count: number
  case_count: number
  skill_count: number
  session_count: number
  profile_count: number
  document_count: number
  ledger_count: number
}

export function readGlobalSearch(
  q: string,
  limitPerKind = 5,
  options: { demo?: boolean } = {},
): CancelablePromise<SearchResultsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/search/",
    query: {
      q: q.trim(),
      limit_per_kind: limitPerKind,
      demo: options.demo || undefined,
    },
  })
}
