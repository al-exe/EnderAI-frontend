import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Lock,
  Share2,
  Users,
} from "lucide-react"
import { type DragEvent, type ReactNode, useMemo, useState } from "react"

import {
  readV2DocumentFolders,
  readV2Documents,
  updateV2Document,
  type V2DocumentFolderPublic,
  type V2DocumentPublic,
  type V2DocumentsPublic,
  type V2DocumentVisibility,
} from "@/api/v2Documents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FolderCreateDialog } from "@/components/V2/Library/FolderControls"
import useCustomToast from "@/hooks/useCustomToast"
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
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [libraryView, setLibraryView] = useState<"files" | "folders">("files")
  const [selectedFolderId, setSelectedFolderId] = useState("all")
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(
    () => new Set(["unfiled"]),
  )
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const documentsQueryKey = ["v2-documents", { demo: isDemoMode }] as const

  const documentsQuery = useQuery({
    queryKey: documentsQueryKey,
    queryFn: () => readV2Documents({ demo: isDemoMode }),
  })

  const foldersQuery = useQuery({
    queryKey: ["v2-document-folders", { demo: isDemoMode }],
    queryFn: () => readV2DocumentFolders({ demo: isDemoMode }),
  })

  const moveDocumentMutation = useMutation({
    mutationFn: ({
      documentId,
      folderId,
    }: {
      documentId: string
      folderId: string | null
    }) =>
      updateV2Document(
        documentId,
        { folder_id: folderId },
        { demo: isDemoMode },
      ),
    onMutate: async ({ documentId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: documentsQueryKey })
      const previousDocuments =
        queryClient.getQueryData<V2DocumentsPublic>(documentsQueryKey)
      const targetFolder = folderId
        ? folders.find((folder) => folder.id === folderId)
        : null

      queryClient.setQueryData<V2DocumentsPublic>(
        documentsQueryKey,
        (current) => {
          if (!current) return current
          return {
            ...current,
            data: current.data.map((document) =>
              document.id === documentId
                ? {
                    ...document,
                    folder_id: folderId,
                    folder_name: targetFolder?.name ?? null,
                  }
                : document,
            ),
          }
        },
      )

      return { previousDocuments }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKey,
      })
      showSuccessToast("Document moved.")
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(documentsQueryKey, context.previousDocuments)
      }
      showErrorToast("Could not move document.")
    },
    onSettled: () => {
      setDragOverFolderId(null)
    },
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
  const documentsByFolder = useMemo(() => {
    const grouped = new Map<string, V2DocumentPublic[]>()
    grouped.set("unfiled", [])
    for (const folder of folders) {
      grouped.set(folder.id, [])
    }
    for (const document of documents) {
      const folderId =
        document.folder_id && grouped.has(document.folder_id)
          ? document.folder_id
          : "unfiled"
      grouped.get(folderId)?.push(document)
    }
    return grouped
  }, [documents, folders])
  const isLoading = documentsQuery.isLoading || foldersQuery.isLoading
  const isEmpty =
    !isLoading &&
    documents.length === 0 &&
    (libraryView === "files" || folders.length === 0)
  const isFolderEmpty =
    !isLoading && documents.length > 0 && visibleDocuments.length === 0

  if (router.location.pathname.startsWith("/v2/library/")) {
    return <Outlet />
  }

  const toggleFolderOpen = (folderId: string) => {
    setOpenFolderIds((current) => {
      const next = new Set(current)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const moveDocument = (documentId: string, folderId: string | null) => {
    if (isDemoMode || moveDocumentMutation.isPending) return
    const document = documents.find((item) => item.id === documentId)
    if (!document || (document.folder_id ?? null) === folderId) {
      setDragOverFolderId(null)
      return
    }
    moveDocumentMutation.mutate({ documentId, folderId })
  }

  const handleFolderDragOver = (
    event: DragEvent<HTMLElement>,
    folderId: string,
  ) => {
    if (isDemoMode) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragOverFolderId(folderId)
  }

  const handleFolderDrop = (
    event: DragEvent<HTMLElement>,
    folderId: string | null,
  ) => {
    event.preventDefault()
    const documentId = event.dataTransfer.getData("application/x-v2-document")
    if (!documentId) return
    if (folderId) {
      setOpenFolderIds((current) => new Set(current).add(folderId))
    }
    moveDocument(documentId, folderId)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Library view"
            className="inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground"
          >
            <LibraryViewToggle
              label="Files"
              active={libraryView === "files"}
              onClick={() => setLibraryView("files")}
            />
            <LibraryViewToggle
              label="Folders"
              active={libraryView === "folders"}
              onClick={() => setLibraryView("folders")}
            />
          </div>
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

      {!isLoading && documents.length > 0 && libraryView === "files" && (
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

      {!isLoading &&
        (documents.length > 0 || folders.length > 0) &&
        libraryView === "folders" && (
          <FolderDirectory
            folders={folders}
            documentsByFolder={documentsByFolder}
            openFolderIds={openFolderIds}
            dragOverFolderId={dragOverFolderId}
            canMoveDocuments={!isDemoMode && !moveDocumentMutation.isPending}
            onToggleFolder={toggleFolderOpen}
            onDocumentDragStart={(event, document) => {
              event.dataTransfer.effectAllowed = "move"
              event.dataTransfer.setData(
                "application/x-v2-document",
                document.id,
              )
            }}
            onDocumentDragEnd={() => setDragOverFolderId(null)}
            onFolderDragOver={handleFolderDragOver}
            onFolderDrop={handleFolderDrop}
            onFolderDragLeave={() => setDragOverFolderId(null)}
          />
        )}
    </section>
  )
}

function LibraryViewToggle({
  label,
  active,
  onClick,
}: {
  label: "Files" | "Folders"
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={onClick}
      className="inline-flex h-[calc(100%-1px)] min-w-20 items-center justify-center whitespace-nowrap rounded-md border border-transparent px-3 py-1 text-sm font-medium text-foreground transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground"
    >
      {label}
    </button>
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

function FolderDirectory({
  folders,
  documentsByFolder,
  openFolderIds,
  dragOverFolderId,
  canMoveDocuments,
  onToggleFolder,
  onDocumentDragStart,
  onDocumentDragEnd,
  onFolderDragOver,
  onFolderDrop,
  onFolderDragLeave,
}: {
  folders: V2DocumentFolderPublic[]
  documentsByFolder: Map<string, V2DocumentPublic[]>
  openFolderIds: Set<string>
  dragOverFolderId: string | null
  canMoveDocuments: boolean
  onToggleFolder: (folderId: string) => void
  onDocumentDragStart: (
    event: DragEvent<HTMLAnchorElement>,
    document: V2DocumentPublic,
  ) => void
  onDocumentDragEnd: () => void
  onFolderDragOver: (event: DragEvent<HTMLElement>, folderId: string) => void
  onFolderDrop: (event: DragEvent<HTMLElement>, folderId: string | null) => void
  onFolderDragLeave: () => void
}) {
  const unfiledDocuments = documentsByFolder.get("unfiled") ?? []

  return (
    <div className="min-w-0 border bg-card text-card-foreground">
      <DirectoryFolder
        id="unfiled"
        label="Unfiled"
        documents={unfiledDocuments}
        open={openFolderIds.has("unfiled")}
        dragOver={dragOverFolderId === "unfiled"}
        canMoveDocuments={canMoveDocuments}
        onToggle={() => onToggleFolder("unfiled")}
        onDocumentDragStart={onDocumentDragStart}
        onDocumentDragEnd={onDocumentDragEnd}
        onDragOver={(event) => onFolderDragOver(event, "unfiled")}
        onDrop={(event) => onFolderDrop(event, null)}
        onDragLeave={onFolderDragLeave}
      />
      {folders.map((folder) => (
        <DirectoryFolder
          key={folder.id}
          id={folder.id}
          label={folder.name}
          visibility={folder.visibility}
          documents={documentsByFolder.get(folder.id) ?? []}
          open={openFolderIds.has(folder.id)}
          dragOver={dragOverFolderId === folder.id}
          canMoveDocuments={canMoveDocuments}
          onToggle={() => onToggleFolder(folder.id)}
          onDocumentDragStart={onDocumentDragStart}
          onDocumentDragEnd={onDocumentDragEnd}
          onDragOver={(event) => onFolderDragOver(event, folder.id)}
          onDrop={(event) => onFolderDrop(event, folder.id)}
          onDragLeave={onFolderDragLeave}
        />
      ))}
    </div>
  )
}

function DirectoryFolder({
  label,
  visibility,
  documents,
  open,
  dragOver,
  canMoveDocuments,
  onToggle,
  onDocumentDragStart,
  onDocumentDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
}: {
  id: string
  label: string
  visibility?: V2DocumentVisibility
  documents: V2DocumentPublic[]
  open: boolean
  dragOver: boolean
  canMoveDocuments: boolean
  onToggle: () => void
  onDocumentDragStart: (
    event: DragEvent<HTMLAnchorElement>,
    document: V2DocumentPublic,
  ) => void
  onDocumentDragEnd: () => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onDragLeave: () => void
}) {
  return (
    <fieldset
      aria-label={`${label} folder`}
      className={cn("border-b last:border-b-0", dragOver && "bg-muted/70")}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <button
        type="button"
        className="flex h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-muted"
        onClick={onToggle}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        {open ? (
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        {visibility === "organization" && (
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {documents.length}
        </span>
      </button>
      {open && (
        <div className="pb-2">
          {documents.length === 0 && (
            <div className="ml-12 px-3 py-2 text-sm text-muted-foreground">
              Empty folder
            </div>
          )}
          {documents.map((document) => (
            <DirectoryDocumentRow
              key={document.id}
              document={document}
              draggable={canMoveDocuments}
              onDragStart={onDocumentDragStart}
              onDragEnd={onDocumentDragEnd}
            />
          ))}
        </div>
      )}
    </fieldset>
  )
}

function DirectoryDocumentRow({
  document,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  document: V2DocumentPublic
  draggable: boolean
  onDragStart: (
    event: DragEvent<HTMLAnchorElement>,
    document: V2DocumentPublic,
  ) => void
  onDragEnd: () => void
}) {
  return (
    <Link
      to="/v2/library/$documentId"
      params={{ documentId: document.id }}
      draggable={draggable}
      onDragStart={(event) => onDragStart(event, document)}
      onDragEnd={onDragEnd}
      className={cn(
        "ml-10 grid min-h-10 grid-cols-[minmax(0,1fr)_160px_130px] items-center gap-3 px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring max-md:grid-cols-[minmax(0,1fr)]",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{document.title}</span>
      </span>
      <span className="truncate text-xs text-muted-foreground max-md:hidden">
        {document.visibility === "organization" ? "Organization" : "Private"}
      </span>
      <span className="truncate text-xs text-muted-foreground max-md:hidden">
        {formatDateOnly(document.updated_at)}
      </span>
    </Link>
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
