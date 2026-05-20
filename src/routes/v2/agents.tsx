import { createFileRoute } from "@tanstack/react-router"

import { TaskforcePlaceholder } from "@/components/V2/TaskforceShell"

export const Route = createFileRoute("/v2/agents")({
  component: TaskforceAgents,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agents",
      },
    ],
  }),
})

function TaskforceAgents() {
  return (
    <TaskforcePlaceholder
      eyebrow="Taskforce"
      title="Agents"
      description="Agent workspace placeholder."
    />
  )
}
