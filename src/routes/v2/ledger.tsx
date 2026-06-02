import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { LedgerPage } from "@/components/V2/Ledger/LedgerPage"

const boolSearchParam = z.preprocess((value) => {
  if (value === true || value === "true") return true
  if (value === false || value === "false") return false
  return undefined
}, z.boolean().optional())

const searchSchema = z.object({
  actor_id: z.string().optional(),
  client: z.string().optional(),
  cross_boundary: boolSearchParam,
  q: z.string().optional(),
  specialist: z.string().optional(),
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
