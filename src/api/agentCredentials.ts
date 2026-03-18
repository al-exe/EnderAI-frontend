import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface AgentCredentialPublic {
  id: string
  user_id: string
  label: string
  created_at: string | null
  updated_at: string | null
  last_rotated_at: string | null
  current_token_expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
}

export interface AgentCredentialsPublic {
  data: AgentCredentialPublic[]
  count: number
}

export interface AgentCredentialCreate {
  label: string
}

export interface AgentCredentialIssueResult {
  credential: AgentCredentialPublic
  mcp_access_token: string
  token_type?: string
}

export function readAgentCredentials(): CancelablePromise<AgentCredentialsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/agent-credentials/",
  })
}

export function createAgentCredential(
  body: AgentCredentialCreate,
): CancelablePromise<AgentCredentialIssueResult> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/agent-credentials/",
    body,
  })
}

export function rotateAgentCredential(
  credentialId: string,
): CancelablePromise<AgentCredentialIssueResult> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/agent-credentials/{credential_id}/rotate",
    path: {
      credential_id: credentialId,
    },
  })
}

export function revokeAgentCredential(
  credentialId: string,
): CancelablePromise<{ message: string }> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/agent-credentials/{credential_id}",
    path: {
      credential_id: credentialId,
    },
  })
}
