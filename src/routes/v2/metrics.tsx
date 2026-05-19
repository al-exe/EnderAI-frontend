import { createFileRoute } from "@tanstack/react-router"

import { MetricsPage } from "@/components/V2/Metrics/MetricsPage"

export const Route = createFileRoute("/v2/metrics")({
  component: TaskforceMetrics,
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
  return <MetricsPage currentUser={currentUser} />
}
