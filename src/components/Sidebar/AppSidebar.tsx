import {
  Box,
  Boxes,
  FlaskConical,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { useDemoMode } from "@/components/demo-mode-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Home", path: "/" },
  { icon: Box, title: "Topics", path: "/topics" },
  { icon: Boxes, title: "Cases", path: "/cases" },
]

function SidebarCollapseToggle() {
  const { isMobile, open, toggleSidebar } = useSidebar()

  if (isMobile) return null

  const Icon = open ? PanelLeftClose : PanelLeftOpen
  const label = open ? "Collapse" : "Expand"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        data-testid="sidebar-collapse-toggle"
        onClick={toggleSidebar}
      >
        <Icon className="size-[18px] text-muted-foreground" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isDemoMode ? "Disable demo mode" : "Enable demo mode"}
        data-testid="demo-mode-toggle"
        role="switch"
        aria-checked={isDemoMode}
        onClick={toggleDemoMode}
      >
        <FlaskConical className="size-[18px] text-muted-foreground" />
        <span>Demo mode</span>
        <div
          aria-hidden="true"
          className={cn(
            "ml-auto hidden h-6 w-11 rounded-full border border-sidebar-border/70 bg-sidebar-accent/60 p-0.5 transition-colors group-data-[collapsible=icon]:hidden md:block",
            isDemoMode && "bg-sidebar-primary/25",
          )}
        >
          <div
            className={cn(
              "h-5 w-5 rounded-full bg-sidebar-foreground/50 shadow-sm transition-transform",
              isDemoMode &&
                "translate-x-5 bg-sidebar-primary text-sidebar-primary-foreground",
            )}
          />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter className="gap-1">
        <DemoModeToggle />
        <SidebarCollapseToggle />
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
