import { createFileRoute } from "@tanstack/react-router"

import { SkillsPage } from "@/components/Skills/SkillsPage"

export const Route = createFileRoute("/_layout/skills")({
  component: Skills,
  head: () => ({
    meta: [
      {
        title: "Skills",
      },
    ],
  }),
})

function Skills() {
  return <SkillsPage />
}
