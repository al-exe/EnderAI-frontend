import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Check, Circle, ExternalLink, Sparkles } from "lucide-react"
import { useState } from "react"

import { createCheckoutSession } from "@/api/billing"
import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"

type MembershipTier = "free" | "pro" | "max"

type MembershipPlan = {
  tier: MembershipTier
  name: string
  eyebrow: string
  price: string
  priceDetail: string
  description: string
  benefits: string[]
  cta: string
  disabled?: boolean
  highlighted?: boolean
}

const membershipPlans: MembershipPlan[] = [
  {
    tier: "free",
    name: "Free",
    eyebrow: "Start here",
    price: "$0",
    priceDetail: "/ month",
    description:
      "A lightweight workspace for trying Taskforce and keeping basic agent context organized.",
    benefits: [
      "Placeholder benefit for personal document memory",
      "Placeholder benefit for basic search and library access",
      "Placeholder benefit for getting started with agent handoffs",
    ],
    cta: "Included",
  },
  {
    tier: "pro",
    name: "Pro",
    eyebrow: "Early adopter special",
    price: "$4.99",
    priceDetail: "/ month for the first 3 months",
    description:
      "A focused membership for individual builders who want stronger Taskforce workflows.",
    benefits: [
      "Placeholder benefit for richer project memory",
      "Placeholder benefit for Pro search workflows with your own key",
      "Placeholder benefit for early adopter product access",
    ],
    cta: "Select this tier",
    highlighted: true,
  },
  {
    tier: "max",
    name: "Max",
    eyebrow: "Managed usage",
    price: "Monthly",
    priceDetail: "",
    description:
      "A higher ceiling for heavier usage, managed model costs, and larger context operations.",
    benefits: [
      "Placeholder benefit for covered LLM usage",
      "Placeholder benefit for expanded workspace limits",
      "Placeholder benefit for priority Taskforce capabilities",
    ],
    cta: "Select this tier",
  },
]

export const Route = createFileRoute("/v2/pricing")({
  component: TaskforcePricingRoute,
  head: () => ({
    meta: [
      {
        title: "Taskforce Membership",
      },
    ],
  }),
})

function isMembershipTier(
  value: UserPublic["subscription_tier"],
): value is MembershipTier {
  return value === "free" || value === "pro" || value === "max"
}

function TaskforcePricingRoute() {
  const { currentUser } = Route.useRouteContext()

  return <TaskforcePricing currentUser={currentUser} />
}

function TaskforcePricing({ currentUser }: { currentUser: UserPublic }) {
  const currentTier = isMembershipTier(currentUser.subscription_tier)
    ? currentUser.subscription_tier
    : "free"
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(currentTier)
  const { showErrorToast } = useCustomToast()
  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (result) => {
      window.location.assign(result.url)
    },
    onError: handleError.bind(showErrorToast),
  })

  const selectedPlan = membershipPlans.find(
    (plan) => plan.tier === selectedTier,
  )

  return (
    <section className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Taskforce Membership
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Choose the membership tier for how you use Taskforce.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            Free, Pro, and Max are sketched here with placeholder benefit copy
            until the final tier details are locked. Pro keeps the existing
            early adopter $4.99 discount.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {membershipPlans.map((plan) => {
            const isCurrent = plan.tier === currentTier
            const isSelected = plan.tier === selectedTier

            return (
              <Card
                key={plan.tier}
                data-testid={`membership-plan-${plan.tier}`}
                className={cn(
                  "relative flex cursor-pointer flex-col border bg-card transition hover:border-primary/60 hover:shadow-sm",
                  isSelected && "border-primary ring-2 ring-primary/20",
                  plan.highlighted && "bg-primary/[0.03]",
                )}
                onClick={() => setSelectedTier(plan.tier)}
              >
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {plan.eyebrow}
                      </p>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isCurrent && (
                        <Badge variant="secondary">
                          You already have this tier
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge data-testid="membership-selected-indicator">
                          <Sparkles className="size-3" />
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-semibold">{plan.price}</span>
                    {plan.priceDetail && (
                      <span className="text-sm text-muted-foreground">
                        {plan.priceDetail}
                      </span>
                    )}
                  </div>

                  <ul className="grid gap-3 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col items-stretch gap-2">
                  {(plan.tier === "pro" || plan.tier === "max") &&
                  !isCurrent ? (
                    <LoadingButton
                      type="button"
                      loading={checkoutMutation.isPending}
                      disabled={!isSelected}
                      onClick={(event) => {
                        event.stopPropagation()
                        checkoutMutation.mutate(
                          plan.tier === "max" ? "max" : "pro",
                        )
                      }}
                    >
                      <ExternalLink className="size-4" />
                      {isSelected ? plan.cta : `Select ${plan.name}`}
                    </LoadingButton>
                  ) : (
                    <Button
                      type="button"
                      variant={isCurrent ? "secondary" : "outline"}
                      disabled={isCurrent || plan.disabled}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedTier(plan.tier)
                      }}
                    >
                      {isCurrent && <Circle className="size-4 fill-current" />}
                      {isCurrent ? "Current tier" : plan.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedPlan?.name ?? "Free"}
          </span>
          . Final copy, limits, and entitlement details can replace these
          placeholders when the tiers are finalized.
        </div>
      </div>
    </section>
  )
}
