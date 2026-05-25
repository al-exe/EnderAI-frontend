import { Box, Boxes, Home, Sparkles, Users } from "lucide-react"

import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { DemoModeToggle, ExperimentalModeToggle } from "./ModeSwitches"
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
        {currentUser?.is_superuser && (
          <>
            <ExperimentalModeToggle />
            <DemoModeToggle />
          </>
        )}
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
