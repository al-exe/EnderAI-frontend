import { createFileRoute, redirect } from "@tanstack/react-router"

import { ApiError } from "@/client"
import { TaskforceShell } from "@/components/V2/TaskforceShell"
import { isLoggedIn } from "@/hooks/useAuth"
import {
  invalidateTaskforceSession,
  peekTaskforceSession,
  readTaskforceSession,
} from "@/lib/taskforceSession"

function V2BlankFallback() {
  return <main className="min-h-svh bg-background" aria-busy="true" />
}

function V2Pending() {
  const currentUser = peekTaskforceSession()
  if (!currentUser) {
    return <V2BlankFallback />
  }

  return <TaskforceShell currentUser={currentUser} />
}

function V2RouteError() {
  const currentUser = peekTaskforceSession()
  if (currentUser) {
    return <TaskforceShell currentUser={currentUser} />
  }

  return <V2BlankFallback />
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
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        localStorage.removeItem("access_token")
        invalidateTaskforceSession()
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
