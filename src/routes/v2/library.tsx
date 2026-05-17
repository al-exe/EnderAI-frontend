import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { CalendarDays, FileText, Users } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { v2DemoDocuments } from "@/lib/v2-demo-documents"

export const Route = createFileRoute("/v2/library")({
  component: TaskforceLibrary,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Library",
      },
    ],
  }),
})

function TaskforceLibrary() {
  const { isDemoMode } = useDemoMode()
  const router = useRouterState()

  if (router.location.pathname.startsWith("/v2/library/")) {
    return <Outlet />
  }

  if (!isDemoMode) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold">Library</h1>
        </div>

        <div className="border bg-card p-6 text-sm text-muted-foreground">
          No documents yet.
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">Library</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {v2DemoDocuments.map((document) => (
          <Link
            key={document.title}
            to="/v2/library/$documentId"
            params={{ documentId: document.id }}
            className="flex min-h-[320px] flex-col border bg-card p-5 text-card-foreground transition-colors hover:border-sidebar-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <Badge variant="outline">{document.status}</Badge>
            </div>

            <div className="mt-4">
              <h2 className="text-base font-semibold leading-6">
                {document.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {document.description}
              </p>
            </div>

            <dl className="mt-5 grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                <dt className="sr-only">Updated</dt>
                <dd>
                  Created {document.createdAt} - Updated {document.updatedAt}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <dt className="sr-only">Collaborators</dt>
                <dd>{document.collaborators.join(", ")}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Human summary
              </p>
              <p className="mt-2 text-sm leading-6">{document.humanSummary}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
