import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
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
  const router = useRouterState()
  const pathname = router.location.pathname
  const { currentUser } = Route.useRouteContext()
  const { session_id: sessionId } = Route.useSearch()

  // Child route /v2/metrics/methodology renders via Outlet (same pattern as library/agents).
  if (
    pathname.startsWith("/v2/metrics/") &&
    pathname.replace(/\/+$/, "") !== "/v2/metrics"
  ) {
    return <Outlet />
  }

  return <MetricsPage currentUser={currentUser} sessionId={sessionId} />
}
