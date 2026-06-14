import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"

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
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname !== "/v2/fleet",
  })

  return isDetailRoute ? <Outlet /> : <FleetPage />
}
