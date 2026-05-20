import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export type SearchTier = "free" | "pro" | "max" | "admin"
export type SearchRoute = "managed" | "byok:anthropic" | "byok:openai"
export type SearchReason = "upgrade_required" | "byok_required"
export type ByokProvider = "anthropic" | "openai"

export interface ByokCredentialPublic {
  provider: ByokProvider
  key_fingerprint: string
  created_at: string
  last_validated_at: string | null
  revoked_at: string | null
}

export interface ByokCredentialsPublic {
  credentials: ByokCredentialPublic[]
}

export interface SearchEligibilityPublic {
  tier: SearchTier
  allowed: boolean
  route: SearchRoute | null
  reason: SearchReason | null
  byok: ByokCredentialPublic[]
}

export function readSearchEligibility(): CancelablePromise<SearchEligibilityPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/search/eligibility",
  })
}

export function listByokCredentials(): CancelablePromise<ByokCredentialsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/byok",
  })
}

export interface CreateByokArgs {
  provider: ByokProvider
  api_key: string
}

export function createByokCredential(
  args: CreateByokArgs,
): CancelablePromise<ByokCredentialPublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/byok",
    body: args,
    mediaType: "application/json",
  })
}

export function revokeByokCredential(
  provider: ByokProvider,
): CancelablePromise<{ message: string }> {
  return request(OpenAPI, {
    method: "DELETE",
    url: `/api/v1/v2/byok/${provider}`,
  })
}
