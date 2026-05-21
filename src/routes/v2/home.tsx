import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/home")({
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
