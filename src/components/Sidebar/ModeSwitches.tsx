import { FlaskConical, type LucideIcon, Rocket } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { useExperimentalMode } from "@/components/experimental-mode-provider"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

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
        <span>{label}</span>
        <div
          aria-hidden="true"
          data-testid={`${testId}-track`}
          className={cn(
            "ml-auto hidden h-7 w-12 items-center rounded-full border border-sidebar-border/70 bg-muted/70 p-1 shadow-inner transition-colors group-data-[collapsible=icon]:hidden md:flex",
            isActive && "border-sidebar-primary/40 bg-sidebar-primary",
          )}
        >
          <div
            data-testid={`${testId}-thumb`}
            className={cn(
              "size-5 rounded-full bg-background shadow-sm ring-1 ring-black/5 transition-transform",
              isActive &&
                "translate-x-5 bg-sidebar-primary-foreground ring-white/20",
            )}
          />
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function ExperimentalModeToggle() {
  const { isExperimentalMode, toggleExperimentalMode } = useExperimentalMode()

  return (
    <ModeToggle
      icon={Rocket}
      isActive={isExperimentalMode}
      label="Experimental mode"
      testId="experimental-mode-toggle"
      tooltip={
        isExperimentalMode
          ? "Disable experimental mode"
          : "Enable experimental mode"
      }
      onClick={toggleExperimentalMode}
    />
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
