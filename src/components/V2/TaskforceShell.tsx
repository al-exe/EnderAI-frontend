import {
  Outlet,
  Link as RouterLink,
  useRouterState,
} from "@tanstack/react-router"
import { BookOpenText, Component, Home, Search, Shield } from "lucide-react"

import type { UserPublic } from "@/client"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { SidebarCollapseToggle } from "@/components/Common/SidebarCollapseToggle"
import { DemoModeToggle, V2ModeSwitch } from "@/components/Sidebar/ModeSwitches"
import { User } from "@/components/Sidebar/User"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

type TaskforceShellProps = {
  currentUser: UserPublic
}

type TaskforceNavItem = {
  icon: typeof Home
  title: string
  path: string
}

const taskforceItems: TaskforceNavItem[] = [
  { icon: Home, title: "Home", path: "/v2/home" },
  { icon: BookOpenText, title: "Library", path: "/v2/library" },
]

function TaskforceMark() {
  return (
    <RouterLink
      to="/v2/home"
      className="min-w-0 px-1 text-sidebar-foreground group-data-[collapsible=icon]:px-0"
    >
      <span className="text-[1.7rem] font-semibold group-data-[collapsible=icon]:hidden">
        Taskforce
      </span>
      <Component className="hidden size-5 group-data-[collapsible=icon]:block" />
    </RouterLink>
  )
}

function TaskforceNav({ currentUser }: TaskforceShellProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const items = currentUser.is_superuser
    ? [...taskforceItems, { icon: Shield, title: "Admin", path: "/v2/admin" }]
    : taskforceItems

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenu className="px-2">
      {items.map((item) => {
        const isActive =
          currentPath === item.path ||
          (item.path === "/v2/library" &&
            currentPath.startsWith("/v2/library/"))

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
              <RouterLink to={item.path} onClick={handleMenuClick}>
                <item.icon className="size-[18px]" />
                <span>{item.title}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function TaskforceShell({ currentUser }: TaskforceShellProps) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <TaskforceMark />
        </SidebarHeader>
        <SidebarContent>
          <TaskforceNav currentUser={currentUser} />
        </SidebarContent>
        <SidebarFooter className="gap-1">
          <DemoModeToggle />
          <V2ModeSwitch active enabled={Boolean(currentUser.v2)} />
          <SidebarCollapseToggle />
          <SidebarAppearance />
          <User user={currentUser} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="shrink-0 border-b bg-background px-5 md:px-8">
          <div className="flex h-16 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="relative w-full max-w-2xl">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search documents"
                className="pl-9"
                data-testid="v2-document-lookup-input"
                placeholder="Search documents"
                readOnly
              />
            </div>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 md:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

type TaskforcePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
}

export function TaskforcePlaceholder({
  eyebrow,
  title,
  description,
}: TaskforcePlaceholderProps) {
  return (
    <section className="flex min-h-0 flex-1 items-start">
      <div className="w-full max-w-3xl border-l border-border pl-5">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  )
}

export function TaskforceNoAccess() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg border-l border-border pl-6">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          Taskforce
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">No access</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Taskforce v2 is not enabled for this account.
        </p>
        <Button asChild className="mt-6">
          <RouterLink to="/home">Return to current app</RouterLink>
        </Button>
      </section>
    </main>
  )
}
