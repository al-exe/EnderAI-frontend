import { createFileRoute, Link } from "@tanstack/react-router"
import { z } from "zod"

import { LedgerPage } from "@/components/V2/Ledger/LedgerPage"
import { V2_PAGE_BODY, V2_PAGE_FRAME } from "@/components/V2/v2PageShell"

const searchSchema = z.object({
  actor_id: z.string().optional(),
  client: z.string().optional(),
  cross_boundary: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => {
      if (value === true || value === "true") return true
      if (value === false || value === "false") return false
      return undefined
    }),
  q: z.string().optional(),
  session_id: z.string().optional(),
  specialist: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  // Timestamp anchor (ISO) used to highlight the transcript line a Fleet
  // activity entry deep-links to. Transcript lines have no stable id, so the
  // detail view highlights the line whose occurred_at is closest (TF-247).
  at: z.string().optional(),
})

export const Route = createFileRoute("/v2/ledger")({
  component: TaskforceLedger,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Ledger",
      },
    ],
  }),
})

function TaskforceLedger() {
  const search = Route.useSearch()
  const { currentUser } = Route.useRouteContext()

  if (!currentUser.organization_id) {
    return (
      <section className={V2_PAGE_FRAME} data-testid="ledger-team-only">
        <div className={V2_PAGE_BODY}>
          <div className="max-w-2xl border-l border-border pl-5">
            <p className="mb-3 font-mono text-xs tracking-[0.01em] text-muted-foreground">
              Ledger for teams
            </p>
            <h1 className="text-2xl font-semibold">Create or join a team</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Ledger keeps an organization-wide record of sessions across people
              and coding tools. It becomes available after your account joins an
              organization.
            </p>
            <Link
              className="mt-6 inline-flex border border-border bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              search={{ tab: "organization" }}
              to="/v2/settings"
            >
              Manage organization
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return <LedgerPage searchFilters={search} />
}
