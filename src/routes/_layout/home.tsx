import { createFileRoute } from "@tanstack/react-router"

import { HomePage } from "@/components/Home/HomePage"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/home")({
  component: Home,
  head: () => ({
    meta: [
      {
        title: "Home",
      },
    ],
  }),
})

function Home() {
  const { user: currentUser } = useAuth()

  return <HomePage mode="app" signedIn user={currentUser} />
}
