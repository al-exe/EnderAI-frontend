import { createFileRoute, redirect } from "@tanstack/react-router"

import { ApiError, UsersService } from "@/client"
import {
  TaskforceNoAccess,
  TaskforceShell,
} from "@/components/V2/TaskforceShell"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/v2")({
  // Keep session user in route context without re-fetching on every child navigation.
  staleTime: Number.POSITIVE_INFINITY,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }

    try {
      const currentUser = await UsersService.readUserMe()
      return { currentUser }
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        localStorage.removeItem("access_token")
        throw redirect({ to: "/login" })
      }

      throw error
    }
  },
  component: V2Layout,
  errorComponent: TaskforceNoAccess,
  head: () => ({
    meta: [
      {
        title: "Taskforce",
      },
    ],
  }),
})

function V2Layout() {
  const { currentUser } = Route.useRouteContext()

  return <TaskforceShell currentUser={currentUser} />
}
