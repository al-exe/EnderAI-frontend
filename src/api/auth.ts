import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface FirebaseTokenExchangeRequest {
  id_token: string
  full_name?: string | null
}

export interface TokenResponse {
  access_token: string
  token_type?: string
}

export function exchangeFirebaseToken(
  requestBody: FirebaseTokenExchangeRequest,
): CancelablePromise<TokenResponse> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/login/firebase-token",
    body: requestBody,
    mediaType: "application/json",
  })
}
