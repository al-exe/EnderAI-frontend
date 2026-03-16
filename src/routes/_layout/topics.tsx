import { createFileRoute } from "@tanstack/react-router"

import { TopicsPage } from "@/components/Topics/TopicsPage"

export const Route = createFileRoute("/_layout/topics")({
  component: Topics,
  head: () => ({
    meta: [
      {
        title: "Topics",
      },
    ],
  }),
})

function Topics() {
  return <TopicsPage />
}
