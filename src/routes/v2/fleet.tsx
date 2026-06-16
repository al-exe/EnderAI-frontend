import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/fleet")({
  component: FleetLayout,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Fleet",
      },
    ],
  }),
})

function FleetLayout() {
  return <Outlet />
}
