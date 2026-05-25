import { createFileRoute, redirect } from "@tanstack/react-router"

import { ApiError } from "@/client"
import {
  TaskforceNoAccess,
  TaskforceShell,
} from "@/components/V2/TaskforceShell"
import { isLoggedIn } from "@/hooks/useAuth"
import {
  peekTaskforceSession,
  readTaskforceSession,
} from "@/lib/taskforceSession"

function V2Pending() {
  const currentUser = peekTaskforceSession()
  if (!currentUser) {
    return <main className="min-h-svh bg-background" aria-busy="true" />
  }

  return <TaskforceShell currentUser={currentUser} />
}

function V2RouteError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 403) {
    return <TaskforceNoAccess />
  }

  const currentUser = peekTaskforceSession()
  if (currentUser) {
    return <TaskforceShell currentUser={currentUser} />
  }

  return <TaskforceNoAccess />
}

export const Route = createFileRoute("/v2")({
  staleTime: Number.POSITIVE_INFINITY,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }

    try {
      const currentUser = await readTaskforceSession()
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
  pendingComponent: V2Pending,
  errorComponent: V2RouteError,
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
