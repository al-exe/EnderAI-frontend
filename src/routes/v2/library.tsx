import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { CalendarDays, FileText, Users } from "lucide-react"

import { readV2Documents, type V2DocumentPublic } from "@/api/v2Documents"
import { useDemoMode } from "@/components/demo-mode-provider"

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

function formatDateOnly(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
}

function TaskforceLibrary() {
  const { isDemoMode } = useDemoMode()
  const router = useRouterState()

  const documentsQuery = useQuery({
    queryKey: ["v2-documents", { demo: isDemoMode }],
    queryFn: () => readV2Documents({ demo: isDemoMode }),
  })

  if (router.location.pathname.startsWith("/v2/library/")) {
    return <Outlet />
  }

  const documents = documentsQuery.data?.data ?? []
  const isLoading = documentsQuery.isLoading
  const isEmpty = !isLoading && documents.length === 0

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">Library</h1>
      </div>

      {isLoading && (
        <div className="border bg-card p-6 text-sm text-muted-foreground">
          Loading documents…
        </div>
      )}

      {isEmpty && (
        <div className="border bg-card p-6 text-sm text-muted-foreground">
          No documents yet.
        </div>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </section>
  )
}

function DocumentCard({ document }: { document: V2DocumentPublic }) {
  return (
    <Link
      to="/v2/library/$documentId"
      params={{ documentId: document.id }}
      className="flex min-h-[320px] flex-col border bg-card p-5 text-card-foreground transition-colors hover:border-sidebar-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <div className="flex items-start">
        <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-4">
        <h2 className="text-base font-semibold leading-6">{document.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {document.description}
        </p>
      </div>

      <dl className="mt-5 grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          <dt className="sr-only">Updated</dt>
          <dd>
            Created {formatDateOnly(document.created_at)} - Updated{" "}
            {formatDateOnly(document.updated_at)}
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
        <p className="mt-2 text-sm leading-6">{document.human_summary}</p>
      </div>
    </Link>
  )
}
