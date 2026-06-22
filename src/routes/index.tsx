import { createFileRoute, redirect } from "@tanstack/react-router"

import { LandingPage } from "@/components/V2/Landing/LandingPage"
import { isLoggedIn } from "@/hooks/useAuth"
import { getDefaultFrontendPath } from "@/lib/experimentalMode"

export const Route = createFileRoute("/")({
  component: Landing,
  beforeLoad: () => {
    if (isLoggedIn()) {
      throw redirect({ to: getDefaultFrontendPath() as never })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Mission control for your AI",
      },
    ],
  }),
})

function Landing() {
  return <LandingPage />
}
