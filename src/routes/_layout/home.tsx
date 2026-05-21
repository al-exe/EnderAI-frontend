import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/home")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/library" })
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Library",
      },
    ],
  }),
})
