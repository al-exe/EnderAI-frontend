import { Check, Monitor, Moon, Sun } from "lucide-react"

import { type Theme, useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThemeOption = {
  value: Theme
  title: string
  description: string
  icon: typeof Sun
}

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    title: "Light",
    description: "Use the light interface.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Use the dark interface.",
    icon: Moon,
  },
  {
    value: "system",
    title: "System",
    description: "Match this device.",
    icon: Monitor,
  },
]

export default function AppearanceSettings() {
  const { setTheme, theme } = useTheme()

  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h3 className="py-4 text-lg font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Choose how Taskforce looks on this device.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const active = theme === option.value

          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              className={cn(
                "h-auto justify-start rounded-lg p-4 text-left",
                active && "border-sidebar-ring bg-sidebar-accent",
              )}
              aria-pressed={active}
              data-testid={`${option.value}-mode`}
              onClick={() => setTheme(option.value)}
            >
              <div className="flex w-full items-start gap-3">
                <Icon className="mt-0.5 size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{option.title}</span>
                    {active ? <Check className="size-4" /> : null}
                  </div>
                  <p className="mt-1 whitespace-normal text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </section>
  )
}
