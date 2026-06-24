import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/agents/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/v2/profiles/$slug",
      params,
      replace: true,
    })
  },
})
