import { createFileRoute } from "@tanstack/react-router"

import { CrossBoundaryReusePage } from "@/components/V2/Agents/CrossBoundaryReusePage"

export const Route = createFileRoute("/v2/cross-boundary-reuse")({
  component: CrossBoundaryReusePage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Cross-boundary reuse",
      },
    ],
  }),
})
