import { Link as RouterLink } from "@tanstack/react-router"
import { ArrowRight, BarChart3, BookOpenText, Bot } from "lucide-react"

import { Button } from "@/components/ui/button"

const navItems = [
  { icon: BookOpenText, label: "Library" },
  { icon: Bot, label: "Profiles" },
  { icon: BarChart3, label: "Metrics" },
]

const documentRows = [
  {
    title: "Stripe checkout wiring",
    summary: "Subscription decisions, price IDs, and validation notes",
    signal: "Updated today",
  },
  {
    title: "Taskforce MCP metrics",
    summary: "Usage events, token savings, and methodology details",
    signal: "Reused 4 times",
  },
  {
    title: "Library sharing rollout",
    summary: "Organization access, folders, and document permissions",
    signal: "Shared",
  },
]

export function TaskforceLandingPage() {
  return (
    <main
      data-testid="taskforce-landing"
      className="min-h-svh bg-background text-foreground"
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <RouterLink to="/" className="text-xl font-semibold">
          Taskforce
        </RouterLink>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <RouterLink to="/login">Log in</RouterLink>
          </Button>
          <Button asChild>
            <RouterLink to="/signup">Sign up</RouterLink>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-14 pt-8 md:pt-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Mission control for your AI
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] md:text-6xl">
            Taskforce
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Keep agent work in a searchable Library, reuse prior decisions as
            context, and measure the time and tokens Taskforce saves along the
            way.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <RouterLink to="/signup">
                Start with Taskforce
                <ArrowRight />
              </RouterLink>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <RouterLink to="/login">Open Library</RouterLink>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div
            data-testid="taskforce-landing-demo-disclosure"
            className="border-b bg-muted/60 px-5 py-3 text-sm text-muted-foreground"
          >
            Illustrative product preview. Documents and activity below are
            example data.
          </div>
          <div className="grid border-b bg-muted/35 md:grid-cols-[220px_1fr]">
            <div className="border-b p-5 md:border-b-0 md:border-r">
              <div className="text-lg font-semibold">Taskforce</div>
              <div className="mt-6 grid gap-1">
                {navItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground"
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-2 border-b pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Library
                  </p>
                  <h2 className="text-2xl font-semibold">Recent work</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  Example workspace data
                </div>
              </div>

              <div className="grid gap-3 pt-4">
                {documentRows.map((row) => (
                  <div
                    key={row.title}
                    className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <h3 className="font-medium">{row.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.summary}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {row.signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
