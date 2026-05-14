import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface BillingStatusPublic {
  has_customer: boolean
  subscription_status: string | null
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  price_id: string | null
  is_subscription_active: boolean
}

export interface BillingSessionPublic {
  url: string
}

export function readBillingStatus(): CancelablePromise<BillingStatusPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/billing/status",
  })
}

export function createCheckoutSession(): CancelablePromise<BillingSessionPublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/billing/checkout-session",
  })
}

export function createBillingPortalSession(): CancelablePromise<BillingSessionPublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/billing/portal-session",
  })
}
