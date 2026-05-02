import { createFileRoute } from "@tanstack/react-router"

import { HomePage } from "@/components/Home/HomePage"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      {
        title: "EnderAI | Product memory for AI-assisted work",
      },
    ],
  }),
})

function Landing() {
  return <HomePage mode="public" signedIn={isLoggedIn()} />
}
