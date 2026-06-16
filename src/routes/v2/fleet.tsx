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
  const isSessionDetail = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/v2/fleet/$sessionId"),
  })

  // Child route /v2/fleet/$sessionId renders via Outlet (same pattern as library).
  // The roster (/v2/fleet or /v2/fleet/) must render FleetPage — an empty Outlet
  // after hard refresh paints a blank screen until the user navigates away and back.
  if (isSessionDetail) {
    return <Outlet />
  }

  return <FleetPage />
}
