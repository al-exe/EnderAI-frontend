import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import {
  Building2,
  CalendarDays,
  FileText,
  Folder,
  FolderPlus,
  Lock,
  Share2,
  Users,
} from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"

import {
  readV2DocumentFolders,
  readV2Documents,
  type V2DocumentFolderPublic,
  type V2DocumentPublic,
  type V2DocumentVisibility,
} from "@/api/v2Documents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FolderCreateDialog } from "@/components/V2/Library/FolderControls"
import { cn } from "@/lib/utils"

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
  const [selectedFolderId, setSelectedFolderId] = useState("all")
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const documentsQuery = useQuery({
    queryKey: ["v2-documents", { demo: isDemoMode }],
    queryFn: () => readV2Documents({ demo: isDemoMode }),
  })

  const foldersQuery = useQuery({
    queryKey: ["v2-document-folders", { demo: isDemoMode }],
    queryFn: () => readV2DocumentFolders({ demo: isDemoMode }),
  })

  const documents = documentsQuery.data?.data ?? []
  const folders = foldersQuery.data?.data ?? []
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    let unfiled = 0
    for (const document of documents) {
      if (document.folder_id) {
        counts.set(
          document.folder_id,
          (counts.get(document.folder_id) ?? 0) + 1,
        )
      } else {
        unfiled += 1
      }
    }
    return { counts, unfiled }
  }, [documents])
  const visibleDocuments = useMemo(() => {
    if (selectedFolderId === "all") return documents
    if (selectedFolderId === "unfiled") {
      return documents.filter((document) => !document.folder_id)
    }
    return documents.filter(
      (document) => document.folder_id === selectedFolderId,
    )
  }, [documents, selectedFolderId])
  const isLoading = documentsQuery.isLoading
  const isEmpty = !isLoading && documents.length === 0
  const isFolderEmpty =
    !isLoading && documents.length > 0 && visibleDocuments.length === 0

  if (router.location.pathname.startsWith("/v2/library/")) {
    return <Outlet />
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        {!isDemoMode && (
          <Button
            type="button"
            size="sm"
            className="w-fit"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus className="size-4" />
            Create folder
          </Button>
        )}
      </div>

      <FolderCreateDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        demo={isDemoMode}
        onCreated={(folder) => setSelectedFolderId(folder.id)}
      />

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
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <FolderNav
            folders={folders}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            allCount={documents.length}
            unfiledCount={folderCounts.unfiled}
            folderCounts={folderCounts.counts}
            loading={foldersQuery.isLoading}
          />
          <div className="min-w-0">
            {isFolderEmpty && (
              <div className="border bg-card p-6 text-sm text-muted-foreground">
                No documents in this folder.
              </div>
            )}
            {!isFolderEmpty && (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {visibleDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function FolderNav({
  folders,
  selectedFolderId,
  setSelectedFolderId,
  allCount,
  unfiledCount,
  folderCounts,
  loading,
}: {
  folders: V2DocumentFolderPublic[]
  selectedFolderId: string
  setSelectedFolderId: (folderId: string) => void
  allCount: number
  unfiledCount: number
  folderCounts: Map<string, number>
  loading: boolean
}) {
  return (
    <nav
      aria-label="Library folders"
      className="min-w-0 border bg-card p-2 text-sm xl:sticky xl:top-0 xl:self-start"
    >
      <FolderNavButton
        active={selectedFolderId === "all"}
        label="All documents"
        count={allCount}
        icon={<FileText className="size-4" />}
        onClick={() => setSelectedFolderId("all")}
      />
      <FolderNavButton
        active={selectedFolderId === "unfiled"}
        label="Unfiled"
        count={unfiledCount}
        icon={<Folder className="size-4" />}
        onClick={() => setSelectedFolderId("unfiled")}
      />
      <div className="my-2 border-t" />
      {loading && (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          Loading folders…
        </div>
      )}
      {!loading &&
        folders.map((folder) => (
          <FolderNavButton
            key={folder.id}
            active={selectedFolderId === folder.id}
            label={folder.name}
            count={folderCounts.get(folder.id) ?? 0}
            icon={<Folder className="size-4" />}
            visibility={folder.visibility}
            onClick={() => setSelectedFolderId(folder.id)}
          />
        ))}
    </nav>
  )
}

function FolderNavButton({
  active,
  label,
  count,
  icon,
  visibility,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  icon: ReactNode
  visibility?: V2DocumentVisibility
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted",
        active && "bg-muted text-foreground",
      )}
      onClick={onClick}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {visibility === "organization" && (
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
    </button>
  )
}

function DocumentCard({ document }: { document: V2DocumentPublic }) {
  const sharedCount = document.shared_with?.length ?? 0
  return (
    <Link
      to="/v2/library/$documentId"
      params={{ documentId: document.id }}
      className="flex min-h-[320px] flex-col border bg-card p-5 text-card-foreground transition-colors hover:border-sidebar-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <div className="flex items-start">
        <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
        <div className="ml-auto flex flex-wrap justify-end gap-1.5">
          <Badge variant="outline">
            {document.visibility === "organization" ? (
              <Building2 className="size-3" />
            ) : (
              <Lock className="size-3" />
            )}
            {document.visibility === "organization" ? "Org" : "Private"}
          </Badge>
          {sharedCount > 0 && (
            <Badge variant="secondary">
              <Share2 className="size-3" />
              {sharedCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-base font-semibold leading-6">{document.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {document.description}
        </p>
      </div>

      <dl className="mt-5 grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Folder className="size-4" />
          <dt className="sr-only">Folder</dt>
          <dd>{document.folder_name ?? "Unfiled"}</dd>
        </div>
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
          <dt className="sr-only">Access</dt>
          <dd>
            {sharedCount > 0
              ? `${sharedCount} shared member${sharedCount === 1 ? "" : "s"}`
              : "Only owner"}
          </dd>
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
