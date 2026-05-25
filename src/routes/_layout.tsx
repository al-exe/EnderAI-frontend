import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useEffect } from "react"

import { ApiError, type UserPublic, UsersService } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { useExperimentalMode } from "@/components/experimental-mode-provider"
import { GlobalSearchBar } from "@/components/Search/GlobalSearchBar"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import {
  getExperimentalFrontendPath,
  readExperimentalModePreference,
} from "@/lib/experimentalMode"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async ({ location }) => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }

    try {
      const currentUser = await UsersService.readUserMe()

      if (currentUser.is_superuser && readExperimentalModePreference()) {
        throw redirect({
          to: getExperimentalFrontendPath(location.pathname) as never,
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
})

function InternalModeAccessGate({ currentUser }: { currentUser: UserPublic }) {
  const { setDemoMode } = useDemoMode()
  const { setExperimentalMode } = useExperimentalMode()

  useEffect(() => {
    if (currentUser.is_superuser) return
    setDemoMode(false)
    setExperimentalMode(false)
  }, [currentUser.is_superuser, setDemoMode, setExperimentalMode])

  return null
}

function Layout() {
  const { currentUser } = Route.useRouteContext()

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <InternalModeAccessGate currentUser={currentUser} />
      <AppSidebar currentUser={currentUser} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="shrink-0 border-b bg-background px-6 md:px-8">
          <div className="flex h-16 items-center">
            <GlobalSearchBar />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 md:p-8">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
