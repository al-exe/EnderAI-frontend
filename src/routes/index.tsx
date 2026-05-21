import { createFileRoute, redirect } from "@tanstack/react-router"

import { TaskforceLandingPage } from "@/components/V2/TaskforceLandingPage"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/")({
  component: Landing,
  beforeLoad: () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/v2/library" })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | AI work memory",
      },
    ],
  }),
})

function Landing() {
  return <TaskforceLandingPage />
}
