import {
  ClipboardCheck,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Spool,
  Users,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
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
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Spool, title: "Topics", path: "/topics" },
  { icon: ClipboardCheck, title: "Cases", path: "/cases" },
]

function SidebarCollapseToggle() {
  const { isMobile, open, toggleSidebar } = useSidebar()

  if (isMobile) return null

  const Icon = open ? PanelLeftClose : PanelLeftOpen
  const label = open ? "Collapse Sidebar" : "Expand Sidebar"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        data-testid="sidebar-collapse-toggle"
        onClick={toggleSidebar}
      >
        <Icon className="size-4 text-muted-foreground" />
        <span>{label}</span>
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
      <SidebarFooter>
        <SidebarCollapseToggle />
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
