import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/v2/search")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/library" })
  },
})
