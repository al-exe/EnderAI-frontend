import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/sessions")({
  component: SessionsLayout,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Sessions",
      },
    ],
  }),
})

function SessionsLayout() {
  return <Outlet />
}
