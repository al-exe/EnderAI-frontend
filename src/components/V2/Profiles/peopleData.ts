export type ProfileDepartment = "Engineering" | "Product" | "Design"

export interface Profile {
  id: string
  name: string
  initials: string
  role: string
  department: ProfileDepartment
  isAdmin: boolean
  isCurrentUser: boolean
  /** One-line focus / what they own. */
  focus: string
  /** Lead metric — times this person's docs were reused. */
  reuses: number
  /** Documents authored. */
  docs: number
  /** Tokens saved via reuse. */
  tokensSaved: number
  /** Whether the person is active right now (drives the footer dot). */
  active: boolean
  /** Human-readable last-active label (e.g. "12m ago", "Yesterday"). */
  lastActive: string
  /** Their top library folder. */
  topFolder: string
}

/**
 * Seed teammates for the Profiles (People) directory. Mirrors the
 * `mockups/profiles-minimal.html` handoff — the current user is pinned first.
 */
export const PROFILES: Profile[] = [
  {
    id: "alex-lin",
    name: "Alex Lin",
    initials: "AL",
    role: "Staff Engineer · Billing",
    department: "Engineering",
    isAdmin: false,
    isCurrentUser: true,
    focus:
      "Owns the Stripe billing surface and webhook idempotency work. Most-reused author this quarter.",
    reuses: 41,
    docs: 12,
    tokensSaved: 142_000,
    active: true,
    lastActive: "12m ago",
    topFolder: "Billing",
  },
  {
    id: "nadia-osei",
    name: "Nadia Osei",
    initials: "NO",
    role: "Backend · Data",
    department: "Engineering",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "Postgres row-level security and tenant isolation. Maintains the RLS audit playbook.",
    reuses: 18,
    docs: 9,
    tokensSaved: 71_000,
    active: true,
    lastActive: "1h ago",
    topFolder: "Infra",
  },
  {
    id: "jin-park",
    name: "Jin Park",
    initials: "JP",
    role: "Product Eng · Auth",
    department: "Product",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "Leads the Auth0 → Clerk migration. JWT mapping, session bridge, rollout sequencing.",
    reuses: 22,
    docs: 8,
    tokensSaved: 63_000,
    active: true,
    lastActive: "3h ago",
    topFolder: "Auth migration",
  },
  {
    id: "ken-watanabe",
    name: "Ken Watanabe",
    initials: "KW",
    role: "Security Eng",
    department: "Engineering",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "Threat modeling and secrets handling. Reviews every doc touching auth or PII.",
    reuses: 13,
    docs: 6,
    tokensSaved: 40_000,
    active: true,
    lastActive: "5h ago",
    topFolder: "Infra",
  },
  {
    id: "sofia-reyes",
    name: "Sofia Reyes",
    initials: "SR",
    role: "Frontend Eng",
    department: "Design",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "Design-system owner. Drove the Tailwind v4 token migration across the app.",
    reuses: 14,
    docs: 7,
    tokensSaved: 33_000,
    active: false,
    lastActive: "2d ago",
    topFolder: "Frontend",
  },
  {
    id: "marco-diaz",
    name: "Marco Diaz",
    initials: "MD",
    role: "Platform Eng",
    department: "Engineering",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "CI shards, deploy tooling, and the seat-count reconciler. Keeps the pipeline green.",
    reuses: 11,
    docs: 6,
    tokensSaved: 24_000,
    active: false,
    lastActive: "Yesterday",
    topFolder: "Infra",
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    initials: "PN",
    role: "Eng Manager · Admin",
    department: "Engineering",
    isAdmin: true,
    isCurrentUser: false,
    focus:
      "Runs the eng org. Owns roadmap docs and the library sharing rollout policy.",
    reuses: 7,
    docs: 4,
    tokensSaved: 12_000,
    active: false,
    lastActive: "Yesterday",
    topFolder: "Org-wide",
  },
  {
    id: "theo-burns",
    name: "Theo Burns",
    initials: "TB",
    role: "DevEx · CI",
    department: "Engineering",
    isAdmin: false,
    isCurrentUser: false,
    focus:
      "Test infrastructure and flake triage. Maintains the Playwright quarantine list.",
    reuses: 9,
    docs: 5,
    tokensSaved: 19_000,
    active: false,
    lastActive: "4d ago",
    topFolder: "Frontend",
  },
  {
    id: "rae-chen",
    name: "Rae Chen",
    initials: "RC",
    role: "Product · Admin",
    department: "Product",
    isAdmin: true,
    isCurrentUser: false,
    focus:
      "Billing PM. Writes the pricing specs that anchor the checkout and invoice work.",
    reuses: 6,
    docs: 5,
    tokensSaved: 15_000,
    active: true,
    lastActive: "40m ago",
    topFolder: "Billing",
  },
]

export type ProfileFilterKey =
  | "all"
  | "engineering"
  | "product"
  | "design"
  | "admins"

export interface ProfileFilter {
  key: ProfileFilterKey
  label: string
  match: (profile: Profile) => boolean
}

/** Scope facets for the filter bar. Counts are derived from {@link PROFILES}. */
export const PROFILE_FILTERS: ProfileFilter[] = [
  { key: "all", label: "All", match: () => true },
  {
    key: "engineering",
    label: "Engineering",
    match: (p) => p.department === "Engineering",
  },
  {
    key: "product",
    label: "Product",
    match: (p) => p.department === "Product",
  },
  { key: "design", label: "Design", match: (p) => p.department === "Design" },
  { key: "admins", label: "Admins", match: (p) => p.isAdmin },
]
