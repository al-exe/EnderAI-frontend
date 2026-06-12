import { createFileRoute } from "@tanstack/react-router"

import { FleetPage } from "@/components/V2/Fleet/FleetPage"

export const Route = createFileRoute("/v2/fleet")({
  component: FleetRoute,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Fleet",
      },
    ],
  }),
})

function FleetRoute() {
  return <FleetPage />
}
