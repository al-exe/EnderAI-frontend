import { createFileRoute, Link } from "@tanstack/react-router"
import { Check } from "lucide-react"

import { membershipPlans } from "@/data/membershipPlans"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/pricing")({
  component: PublicPricing,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Pricing",
      },
    ],
  }),
})

function PublicPricing() {
  return (
    <main
      data-testid="public-pricing"
      className="min-h-svh overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
    >
      <nav className="relative z-10 flex h-[5.46875rem] items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-white/10 dark:bg-zinc-950 md:px-8">
        <Link
          to="/landing"
          className="inline-flex items-center gap-3 text-[1.3671875rem] font-semibold leading-none"
          aria-label="Taskforce landing"
        >
          <img
            src="/assets/brand/tf-icon-filled.svg"
            alt=""
            className="size-[2.34375rem] dark:hidden"
          />
          <img
            src="/assets/brand/tf-icon-filled-dark.svg"
            alt=""
            className="hidden size-[2.34375rem] dark:block"
          />
          Taskforce
        </Link>
        <div className="flex items-center gap-5 font-mono text-[0.796875rem] text-zinc-500 dark:text-zinc-400">
          <Link
            to="/pricing"
            className="hidden text-zinc-950 dark:text-white sm:inline"
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="bg-zinc-950 px-[0.78125rem] py-[0.46875rem] text-white dark:bg-white dark:text-zinc-950"
          >
            Sign up →
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl space-y-3">
          <div className="font-mono text-[0.85rem] font-medium uppercase tracking-[0.22em] text-[#8447ff]">
            Pricing
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] md:whitespace-nowrap md:text-4xl">
            Choose the <span className="text-[#8447ff]">Taskforce</span> tier
            right for your team
          </h1>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {membershipPlans.map((plan) => (
            <div
              key={plan.tier}
              data-testid={`public-plan-${plan.tier}`}
              className={cn(
                "flex flex-col border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950",
                plan.highlighted && "bg-zinc-50 dark:bg-zinc-900/40",
              )}
            >
              <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {plan.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold">{plan.price}</span>
                {plan.priceDetail && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {plan.priceDetail}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={cn(
                  "mt-8 inline-flex items-center justify-center border px-4 py-3 font-mono text-xs tracking-[0.04em]",
                  plan.tier === "free"
                    ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-200 dark:hover:bg-white/10"
                    : "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950",
                )}
              >
                {plan.tier === "free" ? "Start free →" : `Get ${plan.name} →`}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
