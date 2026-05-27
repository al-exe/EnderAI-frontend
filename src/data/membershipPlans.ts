export type MembershipTier = "free" | "pro" | "max"

export type MembershipPlan = {
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

export const membershipPlans: MembershipPlan[] = [
  {
    tier: "free",
    name: "Free",
    eyebrow: "Start here",
    price: "$0",
    priceDetail: "/ month",
    description: "For hobbyists and those getting started",
    benefits: [
      "Up to 3 agent profiles",
      "256 MB of library storage",
    ],
    cta: "Included",
  },
  {
    tier: "pro",
    name: "Pro",
    eyebrow: "Early adopter special",
    price: "$4.99",
    priceDetail: "/ month for the first 3 months",
    description: "For serious builders and small teams",
    benefits: [
      "Up to 100 agent profiles",
      "100 GB of library storage",
      "Organizations up to 100 members",
    ],
    cta: "Select this tier",
    highlighted: true,
  },
  {
    tier: "max",
    name: "Max",
    eyebrow: "The ultimate package",
    price: "$49.99",
    priceDetail: "/ month",
    description:
      "For enterprise scale teams who can't waste a moment or token",
    benefits: [
      "Up to 1,000 agent profiles",
      "1 TB of library storage",
      "Organizations up to 1,000 members",
      "Access to Enterprise Search in Taskforce",
    ],
    cta: "Select this tier",
  },
]
