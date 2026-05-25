import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { SkillsPage } from "@/components/Skills/SkillsPage"

const searchSchema = z.object({
  skillId: z.string().optional(),
})

export const Route = createFileRoute("/_layout/skills")({
  component: Skills,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Skills",
      },
    ],
  }),
})

function Skills() {
  const { skillId } = Route.useSearch()

  return <SkillsPage initialSelectedSkillId={skillId ?? null} />
}
