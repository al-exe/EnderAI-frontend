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
  const router = useRouterState()
  const pathname = router.location.pathname

  // Child route /v2/fleet/$sessionId renders via Outlet (same pattern as library).
  // A bare /v2/fleet/ (trailing slash, no session id) must still render FleetPage —
  // otherwise a hard refresh paints a blank screen and the Fleet tab stays unselected.
  if (
    pathname.startsWith("/v2/fleet/") &&
    pathname.replace(/\/+$/, "") !== "/v2/fleet"
  ) {
    return <Outlet />
  }

  return <FleetPage />
}
