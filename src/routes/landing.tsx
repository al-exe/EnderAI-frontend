import { createFileRoute } from "@tanstack/react-router"

import { LandingPage } from "@/components/V2/Landing/LandingPage"

export const Route = createFileRoute("/landing")({
  component: LandingPage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | AI work memory",
      },
    ],
  }),
})
