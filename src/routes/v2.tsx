import { createFileRoute, redirect } from "@tanstack/react-router"

import { ApiError, UsersService } from "@/client"
import {
  TaskforceNoAccess,
  TaskforceShell,
} from "@/components/V2/TaskforceShell"
import { isLoggedIn } from "@/hooks/useAuth"
import {
  getCurrentFrontendPath,
  readExperimentalModePreference,
} from "@/lib/experimentalMode"

export const Route = createFileRoute("/v2")({
  beforeLoad: async ({ location }) => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }

    try {
      const currentUser = await UsersService.readUserMe()
      const canUseExperimental =
        currentUser.is_superuser && readExperimentalModePreference()

      if (!canUseExperimental) {
        throw redirect({
          to: getCurrentFrontendPath(location.pathname) as never,
          search: location.search as never,
          replace: true,
        })
      }

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
