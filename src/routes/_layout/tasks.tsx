import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/tasks")({
  component: Tasks,
  head: () => ({
    meta: [
      {
        title: "Tasks",
      },
    ],
  }),
})

function Tasks() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
      <p className="text-muted-foreground">The state of all of your work</p>
    </div>
  )
}
