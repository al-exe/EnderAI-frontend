import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { MetricsPage } from "@/components/V2/Metrics/MetricsPage"

const searchSchema = z.object({
  session_id: z.string().optional(),
})

export const Route = createFileRoute("/v2/metrics")({
  component: TaskforceMetrics,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Metrics",
      },
    ],
  }),
})

function TaskforceMetrics() {
  const { currentUser } = Route.useRouteContext()
  const { session_id: sessionId } = Route.useSearch()
  return <MetricsPage currentUser={currentUser} sessionId={sessionId} />
}
