import { createFileRoute } from "@tanstack/react-router"

import { ExecutionsPage } from "@/components/Executions/ExecutionsPage"

export const Route = createFileRoute("/_layout/executions")({
  component: Executions,
  head: () => ({
    meta: [
      {
        title: "Executions",
      },
    ],
  }),
})

function Executions() {
  return <ExecutionsPage />
}
