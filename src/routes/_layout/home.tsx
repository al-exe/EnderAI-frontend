import { createFileRoute } from "@tanstack/react-router"

import { HomePage } from "@/components/Home/HomePage"

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
  const { currentUser } = Route.useRouteContext()

  return <HomePage mode="app" signedIn user={currentUser} />
}
