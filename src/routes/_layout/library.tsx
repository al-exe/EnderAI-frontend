import { createFileRoute } from "@tanstack/react-router"

import { LibraryList } from "@/components/Library/LibraryList"

export const Route = createFileRoute("/_layout/library")({
  component: Library,
  head: () => ({
    meta: [
      {
        title: "Notes",
      },
    ],
  }),
})

function Library() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground">
          Context notes captured under topics and cases
        </p>
      </div>

      <LibraryList />
    </div>
  )
}
