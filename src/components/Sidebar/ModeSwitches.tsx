import { useNavigate } from "@tanstack/react-router"
import { Component, FlaskConical } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function DemoModeToggle() {
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

type V2ModeSwitchProps = {
  active?: boolean
  enabled: boolean
}

export function V2ModeSwitch({ active = false, enabled }: V2ModeSwitchProps) {
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()

  if (!enabled) return null

  const handleSwitchMode = async () => {
    if (isMobile) {
      setOpenMobile(false)
    }

    await navigate({ to: active ? "/home" : "/v2/home" })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={active ? "Return to current app" : "Open Taskforce v2"}
        data-testid="v2-mode-switch"
        role="switch"
        aria-checked={active}
        isActive={active}
        onClick={handleSwitchMode}
      >
        <Component className="size-[18px] text-muted-foreground transition-colors" />
        <span>Taskforce v2</span>
        <div
          aria-hidden="true"
          data-testid="v2-mode-switch-track"
          className={cn(
            "ml-auto hidden h-6 w-11 items-center rounded-full border border-sidebar-border/70 bg-sidebar-accent/60 px-[3px] transition-colors group-data-[collapsible=icon]:hidden md:flex",
            active && "border-sidebar-ring/30 bg-sidebar-primary/20",
          )}
        >
          <div
            data-testid="v2-mode-switch-thumb"
            className={cn(
              "h-[15px] w-[15px] rounded-full bg-sidebar-foreground/50 shadow-sm transition-transform",
              active && "translate-x-[21px] bg-sidebar-primary",
            )}
          />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
