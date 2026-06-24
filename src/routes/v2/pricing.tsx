import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Check, Circle, ExternalLink } from "lucide-react"
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
import { type MembershipTier, membershipPlans } from "@/data/membershipPlans"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"

export const Route = createFileRoute("/v2/pricing")({
  component: TaskforcePricingRoute,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Pricing",
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

  return (
    <section className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          Choose the <span className="text-[#8447ff]">Taskforce</span> tier right
          for your team
        </h1>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {membershipPlans.map((plan) => {
            const isCurrent = plan.tier === currentTier
            const isSelected = plan.tier === selectedTier

            return (
              <Card
                key={plan.tier}
                data-testid={`membership-plan-${plan.tier}`}
                className={cn(
                  "relative flex h-full cursor-pointer flex-col border bg-card transition hover:border-primary/60 hover:shadow-sm",
                  isSelected && "border-primary ring-2 ring-primary/20",
                  plan.highlighted && "bg-primary/[0.03]",
                )}
                onClick={() => setSelectedTier(plan.tier)}
              >
                <CardHeader className="gap-3">
                  <div className="flex min-h-6 items-start justify-between gap-3">
                    <p className="text-xs font-medium tracking-[0.01em] text-muted-foreground">
                      {plan.eyebrow}
                    </p>
                    {isCurrent && (
                      <Badge variant="secondary" className="shrink-0 text-right">
                        You already have this tier
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="min-h-10 text-pretty">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="flex min-h-14 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-4xl font-semibold leading-none">
                      {plan.price}
                    </span>
                    {plan.priceDetail && (
                      <span className="text-sm leading-snug text-muted-foreground">
                        {plan.priceDetail}
                      </span>
                    )}
                  </div>

                  <ul className="grid flex-1 gap-3 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span className="text-pretty">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto flex flex-col items-stretch gap-2">
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
      </div>
    </section>
  )
}
