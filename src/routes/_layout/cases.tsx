import { createFileRoute } from "@tanstack/react-router"

import { CasesPage } from "@/components/Cases/CasesPage"

export const Route = createFileRoute("/_layout/cases")({
  component: Cases,
  head: () => ({
    meta: [
      {
        title: "Cases",
      },
    ],
  }),
})

function Cases() {
  return <CasesPage />
}
