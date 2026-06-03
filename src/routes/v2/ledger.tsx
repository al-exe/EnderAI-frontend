import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { LedgerPage } from "@/components/V2/Ledger/LedgerPage"

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
  return <LedgerPage searchFilters={search} />
}
