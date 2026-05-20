import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Check, ExternalLink } from "lucide-react"

import { createCheckoutSession } from "@/api/billing"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/v2/pricing")({
  component: TaskforcePricing,
  head: () => ({
    meta: [
      {
        title: "Taskforce Pro",
      },
    ],
  }),
})

function TaskforcePricing() {
  const { showErrorToast } = useCustomToast()
  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (result) => {
      window.location.assign(result.url)
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <section className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Taskforce Pro
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Early adopter access for Taskforce.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            A focused plan for the first users shaping the product. More plan
            details can be added here as the Pro offering settles.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border bg-card p-6 text-card-foreground">
            <h2 className="text-lg font-semibold">What is included</h2>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground">
              {[
                "First 3 months of Taskforce usage",
                "Access to current Taskforce Pro workflows",
                "Early adopter pricing while the plan is finalized",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border bg-card p-6 text-card-foreground">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Early adopter special
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold">$4.99</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Covers the first 3 months of Taskforce usage.
              </p>
            </div>

            <LoadingButton
              type="button"
              className="mt-6 w-full"
              loading={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              <ExternalLink className="size-4" />
              Complete checkout
            </LoadingButton>
          </div>
        </div>
      </div>
    </section>
  )
}
