import { createFileRoute } from "@tanstack/react-router"

import { LibraryList } from "@/components/Library/LibraryList"

export const Route = createFileRoute("/_layout/library")({
  component: Library,
  head: () => ({
    meta: [
      {
        title: "Library",
      },
    ],
  }),
})

function Library() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="text-muted-foreground">
          What I've learned so far.
        </p>
      </div>

      <LibraryList />
    </div>
  )
}
