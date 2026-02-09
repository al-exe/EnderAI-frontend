import { createFileRoute } from "@tanstack/react-router"

import { LibraryList } from "@/components/Library/LibraryList"

export const Route = createFileRoute("/_layout/library")({
  component: Library,
  head: () => ({
    meta: [
      {
        title: "Artifacts",
      },
    ],
  }),
})

function Library() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artifacts</h1>
        <p className="text-muted-foreground">Execution artifacts captured so far</p>
      </div>

      <LibraryList />
    </div>
  )
}
