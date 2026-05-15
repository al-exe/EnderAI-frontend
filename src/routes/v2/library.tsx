import { createFileRoute } from "@tanstack/react-router"

import { TaskforcePlaceholder } from "@/components/V2/TaskforceShell"

export const Route = createFileRoute("/v2/library")({
  component: TaskforceLibrary,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Library",
      },
    ],
  }),
})

function TaskforceLibrary() {
  return (
    <TaskforcePlaceholder
      eyebrow="Taskforce"
      title="Library"
      description="Captured context placeholder."
    />
  )
}
