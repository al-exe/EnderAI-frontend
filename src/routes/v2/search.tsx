import { createFileRoute } from "@tanstack/react-router"

import { SearchPage } from "@/components/V2/Search/SearchPage"

export const Route = createFileRoute("/v2/search")({
  component: TaskforceSearch,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Search",
      },
    ],
  }),
})

function TaskforceSearch() {
  const { currentUser } = Route.useRouteContext()
  return <SearchPage currentUser={currentUser} />
}
