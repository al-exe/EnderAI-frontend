import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function SidebarCollapseToggle() {
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
