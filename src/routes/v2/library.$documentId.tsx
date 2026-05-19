import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Building2,
  Eye,
  Folder,
  Link as LinkIcon,
  Lock,
  Pencil,
  Search,
  Share2,
  X,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"

import {
  type OrganizationMemberPublic,
  readMyOrganization,
} from "@/api/organizations"
import {
  readV2Document,
  readV2DocumentFolders,
  readV2DocumentShares,
  replaceV2DocumentShares,
  updateV2Document,
  type V2DocumentDetailsSection,
  type V2DocumentFolderPublic,
  type V2DocumentParagraph,
  type V2DocumentPublic,
  type V2DocumentSharePermission,
  type V2DocumentSharePublic,
  type V2DocumentUpdate,
  type V2DocumentVisibility,
} from "@/api/v2Documents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FolderCreateDialog,
  FolderPickerDropdown,
} from "@/components/V2/Library/FolderControls"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/v2/library/$documentId")({
  component: TaskforceDocumentDetail,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Document",
      },
    ],
  }),
})

type ViewMode = "summary" | "details" | "split"

type AnchorPick = {
  paragraphIndex: number
  segmentIndex: number
  start: number
  end: number
  text: string
}

type DetailsPick = {
  sectionIndex: number
  start: number
  end: number
  text: string
}

type EditableDoc = {
  title: string
  description: string
  human_summary: string
  ai_generated_summary: string
  folder_id: string | null
  visibility: V2DocumentVisibility
  details_file_name: string
  main_body: V2DocumentParagraph[]
  details_markdown_sections: V2DocumentDetailsSection[]
}

type ShareDraft = Record<string, V2DocumentSharePermission>

function toEditable(document: V2DocumentPublic): EditableDoc {
  return {
    title: document.title,
    description: document.description,
    human_summary: document.human_summary,
    ai_generated_summary: document.ai_generated_summary,
    folder_id: document.folder_id ?? null,
    visibility: document.visibility,
    details_file_name: document.details_file_name,
    main_body: document.main_body.map((p) => ({
      segments: p.segments.map((s) => ({ ...s })),
    })),
    details_markdown_sections: document.details_markdown_sections.map((s) => ({
      ...s,
    })),
  }
}

function toUpdatePayload(edit: EditableDoc): V2DocumentUpdate {
  return {
    title: edit.title.trim(),
    description: edit.description,
    human_summary: edit.human_summary,
    ai_generated_summary: edit.ai_generated_summary,
    folder_id: edit.folder_id,
    visibility: edit.visibility,
    details_file_name: edit.details_file_name,
    main_body: edit.main_body,
    details_markdown_sections: edit.details_markdown_sections,
  }
}

function formatDateOnly(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
}

function shortAnchorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `evidence-${crypto.randomUUID().slice(0, 8)}`
  }
  return `evidence-${Math.random().toString(36).slice(2, 10)}`
}

function getOffsetWithin(
  root: Node,
  target: Node,
  targetOffset: number,
): number {
  if (!root.contains(target)) return -1
  let offset = 0
  const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node === target) {
      return offset + targetOffset
    }
    offset += node.textContent?.length ?? 0
    node = walker.nextNode()
  }
  return -1
}

function TaskforceDocumentDetail() {
  const { documentId } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState<ViewMode>("summary")
  const [activeEvidenceAnchorId, setActiveEvidenceAnchorId] = useState<string>()
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState<EditableDoc | null>(null)
  const [anchorMode, setAnchorMode] = useState(false)
  const [summaryPick, setSummaryPick] = useState<AnchorPick | null>(null)
  const [detailsPick, setDetailsPick] = useState<DetailsPick | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [shareDraft, setShareDraft] = useState<ShareDraft>({})
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const documentQuery = useQuery({
    queryKey: ["v2-document", documentId, { demo: isDemoMode }],
    queryFn: () => readV2Document(documentId, { demo: isDemoMode }),
  })

  const document = documentQuery.data
  const isOwner = Boolean(document && user?.id === document.owner_id)
  const canEditDocument = Boolean(document && document.user_access !== "viewer")
  const canManageDocument = isOwner && !isDemoMode

  const foldersQuery = useQuery({
    queryKey: ["v2-document-folders", { demo: isDemoMode }],
    queryFn: () => readV2DocumentFolders({ demo: isDemoMode }),
    enabled: Boolean(document),
  })

  const organizationQuery = useQuery({
    queryKey: ["organization-me"],
    queryFn: readMyOrganization,
    enabled: canManageDocument,
  })

  const sharesQuery = useQuery({
    queryKey: ["v2-document-shares", documentId],
    queryFn: () => readV2DocumentShares(documentId),
    enabled: canManageDocument,
  })

  const updateMutation = useMutation({
    mutationFn: (body: V2DocumentUpdate) =>
      updateV2Document(documentId, body, { demo: document?.is_demo }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["v2-document", documentId, { demo: isDemoMode }],
        data,
      )
      queryClient.invalidateQueries({
        queryKey: ["v2-documents", { demo: isDemoMode }],
      })
      queryClient.invalidateQueries({
        queryKey: ["v2-document-folders", { demo: isDemoMode }],
      })
      showSuccessToast("Document saved.")
    },
    onError: () => {
      showErrorToast("Could not save document.")
    },
  })

  const shareMutation = useMutation({
    mutationFn: () =>
      replaceV2DocumentShares(documentId, {
        shares: Object.entries(shareDraft).map(([user_id, permission]) => ({
          user_id,
          permission,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2-document", documentId, { demo: isDemoMode }],
      })
      queryClient.invalidateQueries({
        queryKey: ["v2-document-shares", documentId],
      })
      queryClient.invalidateQueries({
        queryKey: ["v2-documents", { demo: isDemoMode }],
      })
      setAccessOpen(false)
      showSuccessToast("Sharing updated.")
    },
    onError: () => {
      showErrorToast("Could not update sharing.")
    },
  })

  const isSplit = viewMode === "split"
  const summaryVisible = viewMode === "summary" || isSplit
  const detailsVisible = viewMode === "details" || isSplit

  const showEvidence = (anchorId: string) => {
    setActiveEvidenceAnchorId(anchorId)
    setViewMode("split")
    window.setTimeout(() => {
      window.document
        .getElementById(anchorId)
        ?.scrollIntoView({ block: "start", behavior: "smooth" })
    }, 0)
  }

  const closeSplit = () => {
    setViewMode("summary")
    setActiveEvidenceAnchorId(undefined)
    setAnchorMode(false)
    setSummaryPick(null)
    setDetailsPick(null)
  }

  const enterEdit = () => {
    if (!document || !canEditDocument) return
    setEditState(toEditable(document))
    setIsEditing(true)
    setAnchorMode(false)
    setSummaryPick(null)
    setDetailsPick(null)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditState(null)
  }

  const saveEdit = () => {
    if (!editState) return
    updateMutation.mutate(toUpdatePayload(editState), {
      onSuccess: () => {
        setIsEditing(false)
        setEditState(null)
      },
    })
  }

  const seedShareDraft = () => {
    const shares = sharesQuery.data?.data ?? document?.shared_with ?? []
    setShareDraft(
      Object.fromEntries(
        shares.map((share) => [share.user_id, share.permission]),
      ),
    )
  }

  const setAccessDropdownOpen = (open: boolean) => {
    if (open) seedShareDraft()
    setAccessOpen(open)
  }

  const moveDocumentToFolder = (folderId: string | null) => {
    updateMutation.mutate({ folder_id: folderId })
  }

  const confirmAnchor = () => {
    if (!document || !summaryPick || !detailsPick) return

    const anchorId = shortAnchorId()

    const nextMainBody: V2DocumentParagraph[] = document.main_body.map(
      (paragraph, pIdx) => {
        if (pIdx !== summaryPick.paragraphIndex) return paragraph
        const nextSegments = paragraph.segments.flatMap((segment, sIdx) => {
          if (sIdx !== summaryPick.segmentIndex) return [segment]
          const text = segment.text
          const before = text.slice(0, summaryPick.start)
          const middle = text.slice(summaryPick.start, summaryPick.end)
          const after = text.slice(summaryPick.end)
          const out: V2DocumentParagraph["segments"] = []
          if (before) out.push({ text: before })
          out.push({ text: middle, evidence_anchor_id: anchorId })
          if (after) out.push({ text: after })
          return out
        })
        return { segments: nextSegments }
      },
    )

    const nextDetailsSections: V2DocumentDetailsSection[] =
      document.details_markdown_sections.flatMap((section, idx) => {
        if (idx !== detailsPick.sectionIndex) return [section]
        const md = section.markdown
        const before = md.slice(0, detailsPick.start)
        const middle = md.slice(detailsPick.start, detailsPick.end)
        const after = md.slice(detailsPick.end)
        const out: V2DocumentDetailsSection[] = []
        if (before.trim()) {
          out.push({ anchor_id: `${section.anchor_id}-pre`, markdown: before })
        }
        out.push({ anchor_id: anchorId, markdown: middle })
        if (after.trim()) {
          out.push({ anchor_id: `${section.anchor_id}-post`, markdown: after })
        }
        return out
      })

    updateMutation.mutate(
      {
        main_body: nextMainBody,
        details_markdown_sections: nextDetailsSections,
      },
      {
        onSuccess: () => {
          setAnchorMode(false)
          setSummaryPick(null)
          setDetailsPick(null)
          setActiveEvidenceAnchorId(anchorId)
        },
      },
    )
  }

  if (documentQuery.isLoading) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl text-sm text-muted-foreground">
          Loading document…
        </div>
      </section>
    )
  }

  if (!document) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-semibold">Document not found</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            No document exists for `{documentId}`.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/v2/library">Back to library</Link>
          </Button>
        </div>
      </section>
    )
  }

  const editing = isEditing && editState !== null
  const anchorReady = anchorMode && summaryPick && detailsPick

  return (
    <section
      data-testid="v2-document-scroll"
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isSplit ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto",
      )}
    >
      <article
        className={cn(
          "mx-auto flex w-full max-w-none flex-col px-4 md:px-6 lg:px-8",
          isSplit ? "md:min-h-0 md:flex-1 md:overflow-hidden" : "pb-16",
        )}
      >
        <div className="-ml-3 mb-4 flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            data-testid="v2-document-back-link"
            className="w-fit"
          >
            <Link to="/v2/library">
              <ArrowLeft className="size-4" />
              Library
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            {!canEditDocument && (
              <Badge variant="outline">
                <Eye className="size-3" />
                View only
              </Badge>
            )}
            {!editing && canEditDocument && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={enterEdit}
                data-testid="document-edit"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                  data-testid="document-save"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div
          data-testid="v2-document-sticky-header"
          className={cn(
            "sticky top-0 z-20 border-b bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
            isSplit && "md:shrink-0",
          )}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {editing ? (
              <input
                type="text"
                value={editState.title}
                onChange={(event) =>
                  setEditState({ ...editState, title: event.target.value })
                }
                className="w-full border bg-background px-3 py-1 text-3xl font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:max-w-xl"
                data-testid="edit-title"
              />
            ) : (
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {document.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Document view"
                className="inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground"
              >
                <ViewToggle
                  label="Summary"
                  active={viewMode === "summary"}
                  onClick={() => {
                    setViewMode("summary")
                    setActiveEvidenceAnchorId(undefined)
                    setAnchorMode(false)
                  }}
                />
                <ViewToggle
                  label="Details"
                  active={viewMode === "details"}
                  onClick={() => {
                    setViewMode("details")
                    setActiveEvidenceAnchorId(undefined)
                    setAnchorMode(false)
                  }}
                />
                <ViewToggle
                  label="Split"
                  active={isSplit}
                  onClick={() => {
                    setViewMode("split")
                    setActiveEvidenceAnchorId(undefined)
                  }}
                />
              </div>

              {isSplit && !editing && canEditDocument && (
                <Button
                  type="button"
                  variant={anchorMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (anchorMode) {
                      setAnchorMode(false)
                      setSummaryPick(null)
                      setDetailsPick(null)
                    } else {
                      setAnchorMode(true)
                    }
                  }}
                  data-testid="anchor-mode-toggle"
                >
                  <LinkIcon className="size-4" />
                  {anchorMode ? "Cancel link" : "Link evidence"}
                </Button>
              )}

              {anchorMode && (
                <Button
                  type="button"
                  size="sm"
                  onClick={confirmAnchor}
                  disabled={!anchorReady || updateMutation.isPending}
                  data-testid="anchor-confirm"
                >
                  {updateMutation.isPending ? "Linking…" : "Confirm anchor"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {editing ? (
          <textarea
            value={editState.description}
            onChange={(event) =>
              setEditState({ ...editState, description: event.target.value })
            }
            rows={2}
            className="mt-5 w-full border bg-background px-3 py-2 text-sm leading-6 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            data-testid="edit-description"
          />
        ) : (
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            {document.description}
          </p>
        )}

        <DocumentMetadata
          document={document}
          editing={editing}
          editState={editState}
          setEditState={setEditState}
          folders={foldersQuery.data?.data ?? []}
          canManageLibrary={canManageDocument}
          organizationMembers={organizationQuery.data?.members ?? []}
          shares={sharesQuery.data?.data ?? document.shared_with ?? []}
          ownerId={document.owner_id}
          accessOpen={accessOpen}
          onAccessOpenChange={setAccessDropdownOpen}
          shareDraft={shareDraft}
          setShareDraft={setShareDraft}
          onSaveAccess={() => shareMutation.mutate()}
          isSavingAccess={shareMutation.isPending}
          isLoadingAccess={sharesQuery.isLoading || organizationQuery.isLoading}
          onMoveFolder={moveDocumentToFolder}
          isMovingFolder={updateMutation.isPending}
          onCreateFolder={() => setCreateFolderOpen(true)}
        />

        <FolderCreateDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          demo={isDemoMode}
          onCreated={(folder) => moveDocumentToFolder(folder.id)}
        />

        {anchorMode && (
          <AnchorHelper summaryPick={summaryPick} detailsPick={detailsPick} />
        )}

        <div
          className={cn(
            "gap-6",
            isSplit
              ? "mt-8 grid grid-cols-1 md:grid md:min-h-0 md:flex-1 md:grid-cols-2 md:overflow-hidden md:pb-4"
              : "mt-8 block",
          )}
        >
          {summaryVisible && (
            <SummaryPane
              document={document}
              editing={editing}
              editState={editState}
              setEditState={setEditState}
              onShowEvidence={showEvidence}
              isSplit={isSplit}
              anchorMode={anchorMode}
              summaryPick={summaryPick}
              setSummaryPick={setSummaryPick}
            />
          )}

          {detailsVisible && (
            <DetailsPane
              document={document}
              editing={editing}
              editState={editState}
              setEditState={setEditState}
              activeEvidenceAnchorId={activeEvidenceAnchorId}
              showClose={isSplit}
              onClose={closeSplit}
              isSplit={isSplit}
              anchorMode={anchorMode}
              detailsPick={detailsPick}
              setDetailsPick={setDetailsPick}
            />
          )}
        </div>
      </article>
    </section>
  )
}

function DocumentMetadata({
  document,
  editing,
  editState,
  setEditState,
  folders,
  canManageLibrary,
  organizationMembers,
  shares,
  ownerId,
  accessOpen,
  onAccessOpenChange,
  shareDraft,
  setShareDraft,
  onSaveAccess,
  isSavingAccess,
  isLoadingAccess,
  onMoveFolder,
  isMovingFolder,
  onCreateFolder,
}: {
  document: V2DocumentPublic
  editing: boolean
  editState: EditableDoc | null
  setEditState: (next: EditableDoc) => void
  folders: V2DocumentFolderPublic[]
  canManageLibrary: boolean
  organizationMembers: OrganizationMemberPublic[]
  shares: V2DocumentSharePublic[]
  ownerId: string
  accessOpen: boolean
  onAccessOpenChange: (open: boolean) => void
  shareDraft: ShareDraft
  setShareDraft: (next: ShareDraft) => void
  onSaveAccess: () => void
  isSavingAccess: boolean
  isLoadingAccess: boolean
  onMoveFolder: (folderId: string | null) => void
  isMovingFolder: boolean
  onCreateFolder: () => void
}) {
  const visibilityLabel =
    document.visibility === "organization" ? "Organization" : "Private"
  const sharedCount = shares.length

  return (
    <dl className="mt-5 grid gap-3 border-y py-4 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide">Created</dt>
        <dd className="mt-1 text-foreground">
          {formatDateOnly(document.created_at)}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide">Updated</dt>
        <dd className="mt-1 text-foreground">
          {formatDateOnly(document.updated_at)}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide">Folder</dt>
        <dd className="mt-1">
          {canManageLibrary ? (
            <FolderPickerDropdown
              folders={folders}
              currentFolderId={document.folder_id ?? null}
              disabled={isMovingFolder}
              onSelect={onMoveFolder}
              onCreateFolder={onCreateFolder}
              triggerLabel={document.folder_name ?? "Unfiled"}
            />
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {document.folder_name ?? "Unfiled"}
              </span>
            </span>
          )}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide">Visibility</dt>
        <dd className="mt-1">
          {editing && editState && canManageLibrary ? (
            <Select
              value={editState.visibility}
              onValueChange={(value) =>
                setEditState({
                  ...editState,
                  visibility: value as V2DocumentVisibility,
                })
              }
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-foreground">
              {document.visibility === "organization" ? (
                <Building2 className="size-4 text-muted-foreground" />
              ) : (
                <Lock className="size-4 text-muted-foreground" />
              )}
              {visibilityLabel}
            </span>
          )}
        </dd>
      </div>
      <div className="min-w-0 md:col-span-2 xl:col-span-4">
        <dt className="text-xs uppercase tracking-wide">Access</dt>
        <dd className="mt-1">
          {canManageLibrary ? (
            <DocumentAccessDropdown
              open={accessOpen}
              onOpenChange={onAccessOpenChange}
              members={organizationMembers}
              ownerId={ownerId}
              shares={shares}
              shareDraft={shareDraft}
              setShareDraft={setShareDraft}
              onSave={onSaveAccess}
              isSaving={isSavingAccess}
              isLoading={isLoadingAccess}
            />
          ) : (
            <span className="text-foreground">
              {sharedCount > 0
                ? `${sharedCount} member${sharedCount === 1 ? "" : "s"}`
                : "Only owner"}
            </span>
          )}
        </dd>
      </div>
    </dl>
  )
}

function DocumentAccessDropdown({
  open,
  onOpenChange,
  members,
  ownerId,
  shares,
  shareDraft,
  setShareDraft,
  onSave,
  isSaving,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: OrganizationMemberPublic[]
  ownerId: string
  shares: V2DocumentSharePublic[]
  shareDraft: ShareDraft
  setShareDraft: (draft: ShareDraft) => void
  onSave: () => void
  isSaving: boolean
  isLoading: boolean
}) {
  const [query, setQuery] = useState("")
  const shareableMembers = members.filter((member) => member.id !== ownerId)
  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return shareableMembers
    return shareableMembers.filter((member) =>
      [member.full_name, member.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    )
  }, [query, shareableMembers])
  const assignedCount = Object.keys(shareDraft).length
  const persistedCount = shares.length

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="document-access"
        >
          <Share2 className="size-4" />
          {persistedCount > 0
            ? `${persistedCount} member${persistedCount === 1 ? "" : "s"}`
            : "Only owner"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[360px] p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search organization users"
            className="h-8 pl-8"
          />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              Loading access…
            </div>
          )}
          {!isLoading && shareableMembers.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No organization members available.
            </div>
          )}
          {!isLoading &&
            filteredMembers.length === 0 &&
            shareableMembers.length > 0 && (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No users found.
              </div>
            )}
          {!isLoading &&
            filteredMembers.map((member) => {
              const permission = shareDraft[member.id]
              const checked = Boolean(permission)
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2"
                >
                  <Checkbox
                    id={`share-${member.id}`}
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      const next = { ...shareDraft }
                      if (nextChecked === true) {
                        next[member.id] = permission ?? "editor"
                      } else {
                        delete next[member.id]
                      }
                      setShareDraft(next)
                    }}
                  />
                  <label htmlFor={`share-${member.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {member.full_name || member.email}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  </label>
                  <div className="flex rounded-md border p-0.5">
                    {(["viewer", "editor"] as V2DocumentSharePermission[]).map(
                      (option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={!checked}
                          onClick={() =>
                            setShareDraft({
                              ...shareDraft,
                              [member.id]: option,
                            })
                          }
                          className={cn(
                            "rounded px-2 py-1 text-xs capitalize disabled:opacity-40",
                            permission === option &&
                              "bg-foreground text-background",
                          )}
                        >
                          {option}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )
            })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <span className="text-xs text-muted-foreground">
            {assignedCount} selected
          </span>
          <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving" : "Save access"}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewToggle({
  label,
  active,
  onClick,
}: {
  label: string
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
      className="inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1 text-sm font-medium text-foreground transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground"
    >
      {label}
    </button>
  )
}

function AnchorHelper({
  summaryPick,
  detailsPick,
}: {
  summaryPick: AnchorPick | null
  detailsPick: DetailsPick | null
}) {
  return (
    <div
      className="mt-3 rounded-md border border-dashed border-purple-300 bg-purple-50/60 px-3 py-2 text-xs text-purple-900 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-100"
      data-testid="anchor-helper"
    >
      <p className="font-medium">Linking evidence</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        <li>
          {summaryPick ? (
            <>
              Summary selected: <em>"{summaryPick.text}"</em>
            </>
          ) : (
            "Select text in Summary (within a non-anchored span)."
          )}
        </li>
        <li>
          {detailsPick ? (
            <>
              Details selected: <em>"{detailsPick.text.slice(0, 60)}…"</em>
            </>
          ) : (
            "Select text in Details (within a single section)."
          )}
        </li>
        <li>Confirm to create the anchor.</li>
      </ol>
    </div>
  )
}

function SummaryPane({
  document,
  editing,
  editState,
  setEditState,
  onShowEvidence,
  isSplit,
  anchorMode,
  summaryPick,
  setSummaryPick,
}: {
  document: V2DocumentPublic
  editing: boolean
  editState: EditableDoc | null
  setEditState: (next: EditableDoc) => void
  onShowEvidence: (anchorId: string) => void
  isSplit: boolean
  anchorMode: boolean
  summaryPick: AnchorPick | null
  setSummaryPick: (pick: AnchorPick | null) => void
}) {
  const reportRef = useRef<HTMLDivElement | null>(null)

  const handleSummarySelection = () => {
    if (!anchorMode || !reportRef.current) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return
    }
    const range = selection.getRangeAt(0)
    const startSpan = (range.startContainer.parentElement?.closest(
      "[data-segment-key]",
    ) ?? null) as HTMLElement | null
    const endSpan = (range.endContainer.parentElement?.closest(
      "[data-segment-key]",
    ) ?? null) as HTMLElement | null
    if (!startSpan || !endSpan || startSpan !== endSpan) return
    if (startSpan.dataset.anchored === "true") return

    const key = startSpan.dataset.segmentKey
    if (!key) return
    const [pIdxStr, sIdxStr] = key.split("-")
    const paragraphIndex = Number(pIdxStr)
    const segmentIndex = Number(sIdxStr)

    const start = getOffsetWithin(
      startSpan,
      range.startContainer,
      range.startOffset,
    )
    const end = getOffsetWithin(startSpan, range.endContainer, range.endOffset)
    if (start < 0 || end < 0 || end <= start) return

    const text = startSpan.textContent?.slice(start, end) ?? ""
    if (!text) return

    setSummaryPick({ paragraphIndex, segmentIndex, start, end, text })
  }

  return (
    <div
      className={cn(
        "space-y-9",
        isSplit && "md:min-h-0 md:overflow-y-auto md:pb-4 md:pr-2",
      )}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        {editing && editState ? (
          <textarea
            value={editState.human_summary}
            onChange={(event) =>
              setEditState({ ...editState, human_summary: event.target.value })
            }
            rows={3}
            className="w-full border bg-background px-3 py-2 text-base leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            data-testid="edit-human-summary"
          />
        ) : (
          <p className="text-lg leading-8">{document.human_summary}</p>
        )}
      </section>

      {editing && editState && document.ai_generated_summary && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            AI summary (reference)
          </h2>
          <textarea
            value={editState.ai_generated_summary}
            onChange={(event) =>
              setEditState({
                ...editState,
                ai_generated_summary: event.target.value,
              })
            }
            rows={3}
            className="w-full border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            data-testid="edit-ai-summary"
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Report</h2>
        {editing && editState ? (
          <EditableMainBody
            paragraphs={editState.main_body}
            onChange={(next) => setEditState({ ...editState, main_body: next })}
          />
        ) : (
          // biome-ignore lint/a11y/noStaticElementInteractions: captures text selection for evidence anchoring
          <div
            ref={reportRef}
            onMouseUp={handleSummarySelection}
            onKeyUp={handleSummarySelection}
            className={cn(
              "space-y-5 text-base leading-8 text-foreground",
              anchorMode && "cursor-text select-text",
            )}
          >
            {document.main_body.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>
                {paragraph.segments.map((segment, segmentIndex) => {
                  const segmentKey = `${paragraphIndex}-${segmentIndex}`
                  const isAnchored = Boolean(segment.evidence_anchor_id)
                  const isPicked =
                    summaryPick?.paragraphIndex === paragraphIndex &&
                    summaryPick?.segmentIndex === segmentIndex

                  if (!isAnchored) {
                    return (
                      <span
                        key={segmentKey}
                        data-segment-key={segmentKey}
                        data-anchored="false"
                        className={cn(
                          isPicked && "bg-purple-100 dark:bg-purple-950/60",
                        )}
                      >
                        {segment.text}
                      </span>
                    )
                  }

                  const evidenceAnchorId = segment.evidence_anchor_id as string
                  return (
                    <button
                      key={segmentKey}
                      type="button"
                      data-segment-key={segmentKey}
                      data-anchored="true"
                      aria-label={`Show evidence for: ${segment.text}`}
                      data-testid={`human-evidence-${evidenceAnchorId}`}
                      onClick={() => {
                        if (anchorMode) return
                        onShowEvidence(evidenceAnchorId)
                      }}
                      className="inline rounded-sm bg-purple-100/80 px-1 py-0.5 text-left text-purple-950 transition-colors hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 dark:bg-purple-950/50 dark:text-purple-100 dark:hover:bg-purple-900/70"
                    >
                      {segment.text}
                    </button>
                  )
                })}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EditableMainBody({
  paragraphs,
  onChange,
}: {
  paragraphs: V2DocumentParagraph[]
  onChange: (next: V2DocumentParagraph[]) => void
}) {
  const updateSegmentText = (
    paragraphIndex: number,
    segmentIndex: number,
    text: string,
  ) => {
    const next = paragraphs.map((p, pIdx) => {
      if (pIdx !== paragraphIndex) return p
      return {
        segments: p.segments.map((s, sIdx) =>
          sIdx === segmentIndex ? { ...s, text } : s,
        ),
      }
    })
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <div
          key={paragraphIndex}
          className="rounded-md border bg-card/40 p-3 text-sm leading-6"
        >
          <p className="mb-2 text-xs uppercase text-muted-foreground">
            Paragraph {paragraphIndex + 1}
          </p>
          <div className="space-y-2">
            {paragraph.segments.map((segment, segmentIndex) => {
              const anchored = Boolean(segment.evidence_anchor_id)
              return (
                <div
                  key={segmentIndex}
                  className="flex items-start gap-2"
                  data-testid={`edit-segment-${paragraphIndex}-${segmentIndex}`}
                >
                  {anchored && (
                    <span
                      className="mt-2 inline-flex items-center gap-1 rounded-sm bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-purple-900 dark:bg-purple-950/60 dark:text-purple-100"
                      title={segment.evidence_anchor_id ?? undefined}
                    >
                      <LinkIcon className="size-3" />
                      anchored
                    </span>
                  )}
                  <textarea
                    value={segment.text}
                    onChange={(event) =>
                      updateSegmentText(
                        paragraphIndex,
                        segmentIndex,
                        event.target.value,
                      )
                    }
                    rows={Math.max(1, Math.ceil(segment.text.length / 80))}
                    className="w-full border bg-background px-2 py-1 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function DetailsPane({
  document,
  editing,
  editState,
  setEditState,
  activeEvidenceAnchorId,
  showClose,
  onClose,
  isSplit,
  anchorMode,
  detailsPick,
  setDetailsPick,
}: {
  document: V2DocumentPublic
  editing: boolean
  editState: EditableDoc | null
  setEditState: (next: EditableDoc) => void
  activeEvidenceAnchorId: string | undefined
  showClose: boolean
  onClose: () => void
  isSplit: boolean
  anchorMode: boolean
  detailsPick: DetailsPick | null
  setDetailsPick: (pick: DetailsPick | null) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const sections = useMemo(
    () =>
      editing && editState
        ? editState.details_markdown_sections
        : document.details_markdown_sections,
    [editing, editState, document],
  )

  const fileName =
    editing && editState
      ? editState.details_file_name
      : document.details_file_name

  const handleDetailsSelection = () => {
    if (!anchorMode || !containerRef.current) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return
    }
    const range = selection.getRangeAt(0)
    const startBlock = (range.startContainer.parentElement?.closest(
      "[data-section-key]",
    ) ?? null) as HTMLElement | null
    const endBlock = (range.endContainer.parentElement?.closest(
      "[data-section-key]",
    ) ?? null) as HTMLElement | null
    if (!startBlock || !endBlock || startBlock !== endBlock) return

    const key = startBlock.dataset.sectionKey
    if (!key) return
    const sectionIndex = Number(key)

    const start = getOffsetWithin(
      startBlock,
      range.startContainer,
      range.startOffset,
    )
    const end = getOffsetWithin(startBlock, range.endContainer, range.endOffset)
    if (start < 0 || end < 0 || end <= start) return
    const text = startBlock.textContent?.slice(start, end) ?? ""
    if (!text) return

    setDetailsPick({ sectionIndex, start, end, text })
  }

  return (
    <section
      aria-label={`${fileName} markdown details`}
      className={cn(
        "overflow-hidden rounded-md border bg-card",
        isSplit && "md:flex md:min-h-0 md:flex-col",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground",
          isSplit && "md:shrink-0",
        )}
      >
        {editing && editState ? (
          <input
            type="text"
            value={editState.details_file_name}
            onChange={(event) =>
              setEditState({
                ...editState,
                details_file_name: event.target.value,
              })
            }
            className="min-w-0 flex-1 truncate border bg-background px-2 py-1 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            data-testid="edit-details-filename"
          />
        ) : (
          <span className="truncate">{fileName}</span>
        )}
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="evidence-split-close"
            aria-label="Close details pane"
            onClick={onClose}
            className="-mr-2 h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
            <span className="font-sans">Close</span>
          </Button>
        )}
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: captures text selection for evidence anchoring */}
      <div
        ref={containerRef}
        onMouseUp={handleDetailsSelection}
        onKeyUp={handleDetailsSelection}
        className={cn(
          "px-5 py-4",
          isSplit && "md:min-h-0 md:flex-1 md:overflow-y-auto",
          anchorMode && "cursor-text select-text",
        )}
      >
        {sections.map((section, sectionIndex) => {
          const isActive = activeEvidenceAnchorId === section.anchor_id
          const isPicked = detailsPick?.sectionIndex === sectionIndex

          if (editing && editState) {
            return (
              <textarea
                key={`${section.anchor_id}-${sectionIndex}`}
                value={section.markdown}
                onChange={(event) => {
                  const next = editState.details_markdown_sections.map(
                    (s, idx) =>
                      idx === sectionIndex
                        ? { ...s, markdown: event.target.value }
                        : s,
                  )
                  setEditState({
                    ...editState,
                    details_markdown_sections: next,
                  })
                }}
                rows={Math.max(4, section.markdown.split("\n").length)}
                className="mb-3 w-full border bg-background px-3 py-2 font-mono text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                data-testid={`edit-section-${section.anchor_id}`}
              />
            )
          }

          return (
            <pre
              key={`${section.anchor_id}-${sectionIndex}`}
              id={section.anchor_id}
              data-section-key={sectionIndex}
              data-testid={`ai-evidence-${section.anchor_id}`}
              data-active-evidence={isActive ? "true" : "false"}
              className={cn(
                "scroll-mt-6 whitespace-pre-wrap rounded-sm py-2 font-mono text-sm leading-6 text-foreground transition-colors",
                isActive &&
                  "bg-purple-100/80 px-3 text-purple-950 dark:bg-purple-950/60 dark:text-purple-100",
                isPicked && "outline outline-2 outline-purple-400",
              )}
            >
              <code>{section.markdown}</code>
            </pre>
          )
        })}
      </div>
    </section>
  )
}
