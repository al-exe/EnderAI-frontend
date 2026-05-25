import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { TopicsPage } from "@/components/Topics/TopicsPage"

const searchSchema = z.object({
  topicId: z.string().optional(),
})

export const Route = createFileRoute("/_layout/topics")({
  component: Topics,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Topics",
      },
    ],
  }),
})

function Topics() {
  const { topicId } = Route.useSearch()

  return <TopicsPage initialSelectedTopicId={topicId ?? null} />
}
