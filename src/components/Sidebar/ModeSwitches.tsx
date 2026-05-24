import { FlaskConical } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isDemoMode ? "Disable demo mode" : "Enable demo mode"}
        data-testid="demo-mode-toggle"
        role="switch"
        aria-checked={isDemoMode}
        isActive={isDemoMode}
        className="data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-accent-foreground"
        onClick={toggleDemoMode}
      >
        <FlaskConical
          className={cn(
            "size-[18px] text-muted-foreground transition-colors",
            isDemoMode && "text-sidebar-primary",
          )}
        />
        <span>Demo mode</span>
        <div
          aria-hidden="true"
          data-testid="demo-mode-toggle-track"
          className={cn(
            "ml-auto hidden h-7 w-12 items-center rounded-full border border-sidebar-border/70 bg-muted/70 p-1 shadow-inner transition-colors group-data-[collapsible=icon]:hidden md:flex",
            isDemoMode && "border-sidebar-primary/40 bg-sidebar-primary",
          )}
        >
          <div
            data-testid="demo-mode-toggle-thumb"
            className={cn(
              "size-5 rounded-full bg-background shadow-sm ring-1 ring-black/5 transition-transform",
              isDemoMode &&
                "translate-x-5 bg-sidebar-primary-foreground ring-white/20",
            )}
          />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
