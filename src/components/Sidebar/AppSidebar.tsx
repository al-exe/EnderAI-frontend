import {
  Box,
  Boxes,
  FlaskConical,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
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
  { icon: Home, title: "Home", path: "/home" },
  { icon: Box, title: "Topics", path: "/topics" },
  { icon: Boxes, title: "Cases", path: "/cases" },
  { icon: Sparkles, title: "Skills", path: "/skills" },
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
  const activeButtonClasses = isDemoMode
    ? "bg-violet-600 text-white hover:bg-violet-700 hover:text-white active:bg-violet-700 active:text-white data-[active=true]:bg-violet-600 data-[active=true]:text-white data-[active=true]:hover:bg-violet-700 data-[active=true]:hover:text-white data-[active=true]:active:bg-violet-700 data-[active=true]:active:text-white"
    : ""

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isDemoMode ? "Disable demo mode" : "Enable demo mode"}
        data-testid="demo-mode-toggle"
        role="switch"
        aria-checked={isDemoMode}
        isActive={isDemoMode}
        className={activeButtonClasses}
        onClick={toggleDemoMode}
      >
        <FlaskConical
          className={cn(
            "size-[18px] text-muted-foreground transition-colors",
            isDemoMode && "text-violet-100",
          )}
        />
        <span>Demo mode</span>
        <div
          aria-hidden="true"
          data-testid="demo-mode-toggle-track"
          className={cn(
            "ml-auto hidden h-6 w-11 items-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/60 px-[3px] transition-colors group-data-[collapsible=icon]:hidden md:flex",
            isDemoMode && "border-violet-300/30 bg-white/15",
          )}
        >
          <div
            data-testid="demo-mode-toggle-thumb"
            className={cn(
              "h-[15px] w-[15px] rounded-full bg-sidebar-foreground/50 shadow-sm transition-transform",
              isDemoMode && "translate-x-[21px] bg-white text-violet-700",
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
        <Logo variant="responsive" to="/home" />
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
