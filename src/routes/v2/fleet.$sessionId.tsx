import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/fleet/$sessionId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/v2/sessions/$sessionId",
      params,
      replace: true,
    })
  },
})
