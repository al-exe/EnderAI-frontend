import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react"

import {
  type BillingStatusPublic,
  createBillingPortalSession,
  createCheckoutSession,
  readBillingStatus,
} from "@/api/billing"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const billingStatusQueryKey = ["billingStatus"]

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatStatus(value: string | null): string {
  if (!value) {
    return "No subscription"
  }
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatTier(
  value: BillingStatusPublic["subscription_tier"] | undefined,
) {
  if (!value) return "Free"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const Billing = () => {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const billingStatusQuery = useQuery({
    queryKey: billingStatusQueryKey,
    queryFn: readBillingStatus,
  })

  const checkoutMutation = useMutation({
    mutationFn: () => createCheckoutSession("pro"),
    onSuccess: (result) => {
      window.location.assign(result.url)
    },
    onError: handleError.bind(showErrorToast),
  })

  const portalMutation = useMutation({
    mutationFn: createBillingPortalSession,
    onSuccess: (result) => {
      window.location.assign(result.url)
    },
    onError: handleError.bind(showErrorToast),
  })

  const billingStatus = billingStatusQuery.data
  const tier = billingStatus?.subscription_tier ?? "free"
  const isPaidTier = tier === "pro" || tier === "max"
  const hasCustomer = billingStatus?.has_customer ?? false

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Start or manage your Taskforce subscription through Stripe.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {billingStatusQuery.error ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t load billing status</AlertTitle>
              <AlertDescription>
                Refresh the status or try again after the backend deploy
                finishes.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Subscription status</h3>
                <p className="text-sm text-muted-foreground">
                  Stripe webhooks keep this status in sync after checkout and
                  renewal events.
                </p>
              </div>
              <Badge variant={isPaidTier ? "success" : "secondary"}>
                {formatTier(tier)}
              </Badge>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Stripe status</dt>
                <dd className="font-medium">
                  {formatStatus(billingStatus?.subscription_status ?? null)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current period ends</dt>
                <dd className="font-medium">
                  {formatDate(
                    billingStatus?.subscription_current_period_end ?? null,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Renewal</dt>
                <dd className="font-medium">
                  {billingStatus?.subscription_cancel_at_period_end
                    ? "Cancels at period end"
                    : billingStatus?.is_subscription_active
                      ? "Renews automatically"
                      : "Not active"}
                </dd>
              </div>
            </dl>
          </div>

          <Alert>
            <AlertTitle>Stripe-hosted checkout and billing</AlertTitle>
            <AlertDescription>
              Payment details are handled by Stripe. Taskforce only stores the
              customer ID and subscription state needed for access decisions.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-3">
            <LoadingButton
              type="button"
              loading={checkoutMutation.isPending}
              disabled={isPaidTier}
              onClick={() => checkoutMutation.mutate()}
            >
              <ExternalLink className="h-4 w-4" />
              {isPaidTier ? `${formatTier(tier)} tier` : "Subscribe"}
            </LoadingButton>

            <LoadingButton
              type="button"
              variant="outline"
              loading={portalMutation.isPending}
              disabled={!hasCustomer}
              onClick={() => portalMutation.mutate()}
            >
              <ExternalLink className="h-4 w-4" />
              Manage billing
            </LoadingButton>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void queryClient.invalidateQueries({
                  queryKey: billingStatusQueryKey,
                })
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Billing
