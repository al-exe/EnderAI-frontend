import { Box, Boxes, Home, Sparkles, Users } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { SidebarCollapseToggle } from "@/components/Common/SidebarCollapseToggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { DemoModeToggle, V2ModeSwitch } from "./ModeSwitches"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Home", path: "/home" },
  { icon: Box, title: "Topics", path: "/topics" },
  { icon: Boxes, title: "Cases", path: "/cases" },
  { icon: Sparkles, title: "Skills", path: "/skills" },
]

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
        <V2ModeSwitch enabled={Boolean(currentUser?.v2)} />
        <SidebarCollapseToggle />
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
