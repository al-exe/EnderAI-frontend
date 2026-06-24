import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/agents/")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/profiles", replace: true })
  },
})
