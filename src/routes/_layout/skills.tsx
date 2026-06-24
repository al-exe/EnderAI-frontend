import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/skills")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/profiles" })
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agents",
      },
    ],
  }),
})
