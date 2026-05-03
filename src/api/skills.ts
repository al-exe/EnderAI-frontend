import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export type SkillConfidence = "high" | "medium" | "low"

export interface SkillPublic {
  id: string
  title: string
  slug: string
  description: string | null
  status: string
  source_type: string
  source_topic_id: string | null
  source_case_ids: string[]
  owner_ids: string[]
  is_demo: boolean
  trigger_phrases: string[]
  files: string[]
  symbols: string[]
  errors: string[]
  symptoms: string[]
  instructions_md: string
  confidence: SkillConfidence
  source_snapshot: Record<string, unknown>
  usage_count: number
  created_at: string | null
  updated_at: string | null
  last_used_at: string | null
}

export interface SkillsPublic {
  data: SkillPublic[]
  count: number
}

export interface SkillMatchCandidate {
  skill: SkillPublic
  score: number
  confidence: SkillConfidence
  matched_signals: string[]
  reasoning: string[]
}

export interface SkillUseResult {
  selected_skill: SkillPublic | null
  matched_skills: SkillMatchCandidate[]
  instructions_md: string | null
  confidence: SkillConfidence
  matched_signals: string[]
  provenance: Record<string, unknown>
  agent_usage_note: string
}

export interface ReadSkillsParams {
  status?: string
  source_type?: string
  q?: string
  skip?: number
  limit?: number
  demo?: boolean
}

export function readSkills(
  params: ReadSkillsParams = {},
): CancelablePromise<SkillsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/skills/",
    query: {
      status: params.status?.trim() || undefined,
      source_type: params.source_type?.trim() || undefined,
      q: params.q?.trim() || undefined,
      skip: params.skip,
      limit: params.limit,
      demo: params.demo || undefined,
    },
  })
}

export function readSkill(
  skillId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<SkillPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/skills/{skill_id}",
    path: {
      skill_id: skillId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function useSkillById(
  skillId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<SkillUseResult> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/skills/{skill_id}/use",
    path: {
      skill_id: skillId,
    },
    query: {
      demo: options.demo || undefined,
    },
    body: {},
  })
}
