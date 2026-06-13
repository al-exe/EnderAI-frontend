import { createFileRoute } from "@tanstack/react-router"

import { DocsSite } from "@/components/Docs/DocsSite"

export const Route = createFileRoute("/docs")({
  component: DocsSite,
  head: () => ({
    meta: [
      {
        title: "Taskforce Docs",
      },
      {
        name: "description",
        content:
          "Taskforce documentation for connecting agents, capturing reusable work, and measuring memory reuse.",
      },
    ],
  }),
})
