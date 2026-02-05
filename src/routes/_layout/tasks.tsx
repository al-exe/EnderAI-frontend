import { createFileRoute } from "@tanstack/react-router"

import { TasksPage } from "@/components/Tasks/TasksPage"

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
  return <TasksPage />
}
