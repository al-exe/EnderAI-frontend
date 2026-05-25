import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { CasesPage } from "@/components/Cases/CasesPage"

const searchSchema = z.object({
  caseId: z.string().optional(),
})

export const Route = createFileRoute("/_layout/cases")({
  component: Cases,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Cases",
      },
    ],
  }),
})

function Cases() {
  const { caseId } = Route.useSearch()

  return <CasesPage initialSelectedCaseId={caseId ?? null} />
}
