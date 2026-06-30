import { FlaskConical, type LucideIcon } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import styles from "./ModeSwitches.module.css"

type ModeToggleProps = {
  icon: LucideIcon
  isActive: boolean
  label: string
  testId: string
  tooltip: string
  onClick: () => void
}

function ModeToggle({
  icon: Icon,
  isActive,
  label,
  testId,
  tooltip,
  onClick,
}: ModeToggleProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={tooltip}
        data-testid={testId}
        role="switch"
        aria-checked={isActive}
        isActive={isActive}
        className="data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-accent-foreground"
        onClick={onClick}
      >
        <Icon
          className={cn(
            "size-[18px] text-muted-foreground transition-colors",
            isActive && "text-sidebar-primary",
          )}
        />
        {/* Match the V2 sidebar nav label size (TaskforceShell SIDEBAR_TAB_LABEL_CLASS). */}
        <span className="text-[calc(18px*0.85)]">{label}</span>
        <div
          aria-hidden="true"
          data-mode-switch-track
          data-testid={`${testId}-track`}
          className={cn(
            styles.track,
            "ml-auto hidden h-6 w-11 shrink-0 items-center border border-sidebar-border/80 bg-muted/60 p-0.5 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] transition-[background-color,border-color] duration-150 group-data-[collapsible=icon]:hidden md:flex",
            isActive && "border-sidebar-primary/45 bg-sidebar-primary",
          )}
        >
          <div
            data-mode-switch-thumb
            data-testid={`${testId}-thumb`}
            className={cn(
              styles.thumb,
              "size-[1.125rem] bg-background shadow-[0_1px_2px_rgb(0_0_0/0.14)] ring-1 ring-black/5 transition-transform duration-150 dark:ring-white/10",
              isActive &&
                "translate-x-5 bg-sidebar-primary-foreground ring-white/15",
            )}
          />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode()

  return (
    <ModeToggle
      icon={FlaskConical}
      isActive={isDemoMode}
      label="Demo mode"
      testId="demo-mode-toggle"
      tooltip={isDemoMode ? "Disable demo mode" : "Enable demo mode"}
      onClick={toggleDemoMode}
    />
  )
}
