import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface CommandRecord {
  cmd: string
  purpose?: string | null
  salient_result?: string | null
  ts?: string | null
}

export interface HypothesisRecord {
  statement: string
  status: "open" | "supported" | "disproven"
  evidence?: string | null
  ts?: string | null
}

export interface ChangeRecord {
  kind: "code" | "config" | "infra" | "docs" | "test"
  summary: string
  files: string[]
  refs: string[]
  ts?: string | null
}

export interface RelevantCaseSummary {
  case_id: string
  title: string
  short_summary: string | null
  outcome: string | null
  key_files: string[]
  key_symbols: string[]
  key_errors: string[]
  key_commands: string[]
  why_selected: string | null
}

export interface ContextPackSnapshot {
  topic_id: string | null
  case_id: string | null
  confidence: "high" | "medium" | "low" | null
  alternative_topic_ids: string[]
  topic_summary: string | null
  matched_signals: string[]
  representative_cases: string[]
  recent_cases: string[]
  relevant_cases: RelevantCaseSummary[]
  canonical_files: string[]
  canonical_symbols: string[]
  canonical_errors: string[]
  canonical_symptoms: string[]
  pinned_takeaways: string[]
  ambiguities: string[]
  questions: string[]
  negative_history: string[]
  builder_version: string | null
  created_at: string | null
}

export interface CasePublic {
  id: string
  topic_id: string
  topic_title: string | null
  title: string
  opened_at: string | null
  updated_at: string | null
  closed_at: string | null
  status: string
  actor_id: string | null
  source: string | null
  input_summary: string | null
  summary_current: string | null
  files: string[]
  symbols: string[]
  errors: string[]
  symptoms: string[]
  commands: CommandRecord[]
  hypotheses: HypothesisRecord[]
  changes: ChangeRecord[]
  outcome: string | null
  next_steps: string[]
  context_pack_snapshot: ContextPackSnapshot
}

export interface CasesPublic {
  data: CasePublic[]
  count: number
}

export interface ReadCasesParams {
  topic_id?: string
  status?: string
  q?: string
  skip?: number
  limit?: number
}

export function readCases(
  params: ReadCasesParams = {},
): CancelablePromise<CasesPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/cases/",
    query: {
      topic_id: params.topic_id?.trim() || undefined,
      status: params.status?.trim() || undefined,
      q: params.q?.trim() || undefined,
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readCase(caseId: string): CancelablePromise<CasePublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/cases/{case_id}",
    path: {
      case_id: caseId,
    },
  })
}
