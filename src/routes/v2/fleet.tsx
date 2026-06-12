import { createFileRoute } from "@tanstack/react-router"
import { FleetPage } from "@/components/V2/Fleet/FleetPage"

export const Route = createFileRoute("/v2/fleet")({
  component: FleetPage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Fleet",
      },
    ],
  }),
})
