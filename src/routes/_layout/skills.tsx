import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/skills")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/agents" })
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agents",
      },
    ],
  }),
})
