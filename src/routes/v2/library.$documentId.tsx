import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowLeftRight,
  Bold,
  Clock,
  Eye,
  Folder,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Loader2,
  Pencil,
  Pilcrow,
  Plus,
  ReceiptText,
  Search,
  Share2,
  Star,
  Strikethrough,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import {
  type OrganizationMemberPublic,
  readMyOrganization,
} from "@/api/organizations"
import {
  type AgentSpecialistSummary,
  linkAgentDocument,
  listAgents,
} from "@/api/v2Agents"
import {
  favoriteV2Document,
  readV2Document,
  readV2DocumentFolders,
  readV2DocumentShares,
  replaceV2DocumentShares,
  unfavoriteV2Document,
  updateV2Document,
  type V2DocumentDetailsSection,
  type V2DocumentFolderPublic,
  type V2DocumentParagraph,
  type V2DocumentPublic,
  type V2DocumentSharePermission,
  type V2DocumentSharePublic,
  type V2DocumentUpdate,
} from "@/api/v2Documents"
import {
  type LedgerSessionRow,
  readDocumentLedgerSessions,
} from "@/api/v2Ledger"
import { ApiError } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { formatRelativeTime } from "@/components/V2/Agents/formatters"
import { BackLink } from "@/components/V2/BackLink"
import {
  FolderCreateDialog,
  FolderPickerDropdown,
} from "@/components/V2/Library/FolderControls"
import { QueryErrorState } from "@/components/V2/QueryErrorState"
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

type ViewMode = "summary" | "details"
const MAX_LINKS_PER_SPECIALIST = 25

type EditableDoc = {
  title: string
  description: string
  human_summary: string
  ai_generated_summary: string
  folder_id: string | null
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

const DOCUMENT_CLIENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
}

function documentClientLabel(value: string | null): string {
  if (!value) return "Unknown tool"
  return DOCUMENT_CLIENT_LABELS[value] ?? value
}

function documentSessionAction(row: LedgerSessionRow): string {
  if (row.document_relationship === "produced") {
    return "Produced by"
  }
  if (row.document_relationship === "reused") {
    return "Reused by"
  }
  if (row.document_relationship === "touched") {
    return "Touched by"
  }
  if (row.kinds.some((kind) => kind === "document.created")) {
    return "Produced by"
  }
  if (row.kinds.some((kind) => kind === "document.consulted")) {
    return "Reused by"
  }
  return "Touched by"
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderInlineMarkdown(text: string, keyPrefix = "inline"): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*/g
  let cursor = 0
  let index = 0

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0
    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex))
    }
    if (match[1]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${index++}`}>
          {renderInlineMarkdown(match[1], `${keyPrefix}-strong-${index}`)}
        </strong>,
      )
    } else if (match[2]) {
      nodes.push(
        <s key={`${keyPrefix}-strike-${index++}`}>
          {renderInlineMarkdown(match[2], `${keyPrefix}-strike-${index}`)}
        </s>,
      )
    } else if (match[3]) {
      nodes.push(
        <em key={`${keyPrefix}-em-${index++}`}>
          {renderInlineMarkdown(match[3], `${keyPrefix}-em-${index}`)}
        </em>,
      )
    }
    cursor = matchIndex + match[0].length
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }
  return nodes
}

function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
}

function markdownToHtml(markdown: string): string {
  const blocks = markdown.trim() ? markdown.split(/\n{2,}/) : [""]

  return blocks
    .map((block) => {
      const trimmed = block.trim()
      const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
      if (heading) {
        const level = heading[1].length
        return `<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`
      }
      const lines = block.split("\n").map(inlineMarkdownToHtml).join("<br>")
      return `<p>${lines || "<br>"}</p>`
    })
    .join("")
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ""
  }
  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(nodeToMarkdown).join("")
  }

  const children = Array.from(node.childNodes).map(nodeToMarkdown).join("")
  const tagName = node.tagName.toLowerCase()
  if (tagName === "strong" || tagName === "b") return `**${children}**`
  if (tagName === "em" || tagName === "i") return `*${children}*`
  if (tagName === "s" || tagName === "strike" || tagName === "del") {
    return `~~${children}~~`
  }
  if (tagName === "br") return "\n"
  if (tagName === "h1") return `# ${children}\n\n`
  if (tagName === "h2") return `## ${children}\n\n`
  if (tagName === "h3") return `### ${children}\n\n`
  if (tagName === "p" || tagName === "div") return `${children}\n\n`
  return children
}

function htmlToMarkdown(html: string): string {
  const template = window.document.createElement("template")
  template.innerHTML = html
  return Array.from(template.content.childNodes)
    .map(nodeToMarkdown)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function MarkdownBlocks({
  markdown,
  className,
  variant = "report",
}: {
  markdown: string
  className?: string
  variant?: "report" | "plain"
}) {
  const blocks = markdown.trim() ? markdown.split(/\n{2,}/) : [markdown]

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, index) => {
        const trimmed = block.trim()
        const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
        if (heading) {
          const level = heading[1].length
          const HeadingTag = `h${level}` as "h1" | "h2" | "h3"
          return (
            <HeadingTag
              key={`${trimmed}-${index}`}
              className={cn(
                "text-foreground",
                variant === "plain" && level === 1 && "text-2xl font-semibold",
                variant === "plain" && level === 2 && "text-xl font-semibold",
                variant === "plain" && level === 3 && "text-lg font-semibold",
                variant === "report" && level === 1 && "text-xl font-semibold",
                variant === "report" &&
                  level === 2 &&
                  "border-t border-border pt-5 font-mono text-[0.68rem] font-semibold tracking-[0.01em] text-muted-foreground",
                variant === "report" &&
                  level === 3 &&
                  "text-base font-semibold",
              )}
            >
              {renderInlineMarkdown(heading[2], `heading-${index}`)}
            </HeadingTag>
          )
        }

        const lines = block.split("\n")
        return (
          <p key={`${trimmed}-${index}`} className="whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInlineMarkdown(line, `paragraph-${index}-${lineIndex}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

type RichCommand =
  | { icon: typeof Bold; label: string; command: "bold" }
  | { icon: typeof Italic; label: string; command: "italic" }
  | { icon: typeof Strikethrough; label: string; command: "strikeThrough" }
  | {
      icon: typeof Heading1
      label: string
      command: "formatBlock"
      value: "H1"
    }
  | {
      icon: typeof Heading2
      label: string
      command: "formatBlock"
      value: "H2"
    }
  | {
      icon: typeof Heading3
      label: string
      command: "formatBlock"
      value: "H3"
    }
  | { icon: typeof Pilcrow; label: string; command: "formatBlock"; value: "P" }

const richCommands: RichCommand[] = [
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough" },
  { icon: Heading1, label: "Heading 1", command: "formatBlock", value: "H1" },
  { icon: Heading2, label: "Heading 2", command: "formatBlock", value: "H2" },
  { icon: Heading3, label: "Heading 3", command: "formatBlock", value: "H3" },
  { icon: Pilcrow, label: "Paragraph", command: "formatBlock", value: "P" },
]

function RichTextField({
  value,
  onChange,
  className,
  "data-testid": testId,
}: {
  value: string
  onChange: (next: string) => void
  className?: string
  "data-testid"?: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || window.document.activeElement === editor) return
    editor.innerHTML = markdownToHtml(value)
  }, [value])

  const syncValue = () => {
    const editor = editorRef.current
    if (!editor) return
    onChange(htmlToMarkdown(editor.innerHTML))
  }

  const runCommand = (command: RichCommand) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    window.document.execCommand(
      command.command,
      false,
      "value" in command ? command.value : undefined,
    )
    syncValue()
  }

  return (
    <div className="space-y-2">
      {focused && (
        <div className="sticky top-[4.25rem] z-10 inline-flex flex-wrap items-center gap-1 rounded-md border bg-background p-1 shadow-sm">
          {richCommands.map((command) => {
            const Icon = command.icon
            return (
              <Button
                key={`${command.command}-${command.label}`}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={command.label}
                title={command.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand(command)}
              >
                <Icon className="size-4" />
              </Button>
            )
          })}
        </div>
      )}
      {/* biome-ignore lint/a11y/useSemanticElements: contenteditable keeps document editing inline instead of form controls */}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        data-testid={testId}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          syncValue()
          setFocused(false)
        }}
        onInput={syncValue}
        className={cn(
          "min-h-10 rounded-sm px-1 py-0.5 text-foreground outline-none transition-colors focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_p]:my-2",
          className,
        )}
      />
    </div>
  )
}

function PlainInlineEditor({
  value,
  onChange,
  className,
  "data-testid": testId,
}: {
  value: string
  onChange: (next: string) => void
  className?: string
  "data-testid"?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current || window.document.activeElement === ref.current) return
    ref.current.textContent = value
  }, [value])

  const syncValue = () => {
    onChange(ref.current?.textContent ?? "")
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: contenteditable keeps title and description editing inline
    <div
      ref={ref}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      data-testid={testId}
      onInput={syncValue}
      onBlur={syncValue}
      className={cn(
        "rounded-sm px-1 py-0.5 outline-none transition-colors focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
    />
  )
}

function TaskforceDocumentDetail() {
  const { documentId } = Route.useParams()
  const { isDemoMode } = useDemoMode()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState<ViewMode>("summary")
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState<EditableDoc | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [shareDraft, setShareDraft] = useState<ShareDraft>({})
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [addToAgentOpen, setAddToAgentOpen] = useState(false)

  const documentQuery = useQuery({
    queryKey: ["v2-document", documentId, { demo: isDemoMode }],
    queryFn: () => readV2Document(documentId, { demo: isDemoMode }),
    retry: false,
  })

  const document = documentQuery.data
  const documentSessionsQuery = useQuery({
    queryKey: ["v2-document-sessions", documentId, { demo: isDemoMode }],
    queryFn: () =>
      readDocumentLedgerSessions(documentId, {
        demo: isDemoMode,
        limit: 6,
      }),
    enabled: Boolean(document),
  })
  const isOwner = Boolean(document && user?.id === document.owner_id)
  const canEditDocument = Boolean(document && document.user_access !== "viewer")
  const canManageDocument = isOwner
  // Sharing demo docs to a real org would leak demo content into another
  // user's live view, so keep the access/share affordance hidden when
  // demo mode is on. Rename / move / dates / favorite / delete are safe
  // because they only mutate the current user's own demo-scoped rows.
  const canShareDocument = canManageDocument && !isDemoMode

  const foldersQuery = useQuery({
    queryKey: ["v2-document-folders", { demo: isDemoMode }],
    queryFn: () => readV2DocumentFolders({ demo: isDemoMode }),
    enabled: Boolean(document),
  })

  const organizationQuery = useQuery({
    queryKey: ["organization-me"],
    queryFn: readMyOrganization,
    enabled: canManageDocument,
    retry: false,
  })

  const sharesQuery = useQuery({
    queryKey: ["v2-document-shares", documentId],
    queryFn: () => readV2DocumentShares(documentId),
    enabled: canManageDocument,
    retry: false,
  })
  const agentsQuery = useQuery({
    queryKey: ["v2-agents", isDemoMode],
    queryFn: () => listAgents({ demo: isDemoMode }),
    enabled: addToAgentOpen,
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

  const favoriteMutation = useMutation({
    mutationFn: (next: boolean) =>
      next
        ? favoriteV2Document(documentId, { demo: isDemoMode })
        : unfavoriteV2Document(documentId, { demo: isDemoMode }),
    onMutate: async (next) => {
      const documentKey = ["v2-document", documentId, { demo: isDemoMode }]
      await queryClient.cancelQueries({ queryKey: documentKey })
      const previous = queryClient.getQueryData<V2DocumentPublic>(documentKey)
      if (previous) {
        queryClient.setQueryData<V2DocumentPublic>(documentKey, {
          ...previous,
          is_favorite: next,
        })
      }
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["v2-document", documentId, { demo: isDemoMode }],
          context.previous,
        )
      }
      showErrorToast("Could not update favorite.")
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2-document", documentId, { demo: isDemoMode }],
      })
      queryClient.invalidateQueries({
        queryKey: ["v2-documents", { demo: isDemoMode }],
      })
    },
  })

  const toggleFavorite = () => {
    if (!document || favoriteMutation.isPending) return
    favoriteMutation.mutate(!document.is_favorite)
  }

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
  const addToAgentMutation = useMutation({
    mutationFn: (agentSlug: string) =>
      linkAgentDocument(
        agentSlug,
        { document_id: documentId },
        { demo: isDemoMode },
      ),
    onSuccess: (updated, agentSlug) => {
      queryClient.setQueryData(["v2-agent", agentSlug, isDemoMode], updated)
      queryClient.invalidateQueries({ queryKey: ["v2-agents", isDemoMode] })
      setAddToAgentOpen(false)
      showSuccessToast("Document added to agent.")
    },
    onError: () => {
      showErrorToast("Could not add document to agent.")
    },
  })

  const enterEdit = () => {
    if (!document || !canEditDocument) return
    setEditState(toEditable(document))
    setIsEditing(true)
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

  if (documentQuery.isLoading) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl text-sm text-muted-foreground">
          Loading document…
        </div>
      </section>
    )
  }

  const isDocumentNotFound =
    documentQuery.error instanceof ApiError &&
    documentQuery.error.status === 404

  if (documentQuery.isError && !isDocumentNotFound && !document) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <QueryErrorState
            title="Could not load this document"
            description="The document service returned an unexpected error. Try again without reloading the page."
            onRetry={() => void documentQuery.refetch()}
            isRetrying={documentQuery.isFetching}
            testId="document-detail-load-error"
          />
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
  const documentViewToggle = (
    <div
      role="tablist"
      aria-label="Document view"
      className="flex border border-border bg-background"
    >
      <ViewToggle
        label="Summary"
        active={viewMode === "summary"}
        onClick={() => setViewMode("summary")}
      />
      <ViewToggle
        label="Details"
        active={viewMode === "details"}
        onClick={() => setViewMode("details")}
      />
    </div>
  )

  return (
    <section
      data-testid="v2-document-scroll"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
    >
      <article className="flex w-full max-w-none flex-col px-6 pb-3 pt-0">
        {documentQuery.isError && (
          <QueryErrorState
            title="Document details may be out of date"
            description="The latest document could not be loaded. The last available version is still shown."
            onRetry={() => void documentQuery.refetch()}
            isRetrying={documentQuery.isFetching}
            compact
            testId="document-detail-refresh-error"
          />
        )}
        <div
          data-testid="v2-document-sticky-header"
          className="sticky top-0 z-30 -mx-6 bg-background px-6 pt-1"
        >
          <div className="border-b border-border pb-3">
            <div className="flex items-center justify-between gap-3 font-mono text-[0.66rem] tracking-[0.01em] text-muted-foreground">
              <div className="flex min-w-0 items-center gap-2">
                <BackLink
                  to="/v2/library"
                  fallbackLabel="Library"
                  icon={<ArrowLeft className="size-3" />}
                  data-testid="v2-document-back-link"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                />
                <span className="text-border">/</span>
                <span className="truncate">
                  {document.folder_name ?? "Unfiled"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!canEditDocument && (
                  <Badge variant="outline">
                    <Eye className="size-3" />
                    View only
                  </Badge>
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

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              {editing ? (
                <PlainInlineEditor
                  value={editState.title}
                  onChange={(next) =>
                    setEditState({ ...editState, title: next })
                  }
                  className="w-full text-[1.65rem] font-semibold leading-tight text-foreground md:max-w-3xl"
                  data-testid="edit-title"
                />
              ) : (
                <h1 className="max-w-[30ch] text-[1.65rem] font-semibold leading-tight text-foreground text-balance">
                  {document.title}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-2" />
            </div>

            <DocumentMetadata
              document={document}
              folders={foldersQuery.data?.data ?? []}
              canManageLibrary={canManageDocument}
              canShare={canShareDocument}
              canFavorite={true}
              organizationMembers={organizationQuery.data?.members ?? []}
              shares={sharesQuery.data?.data ?? document.shared_with ?? []}
              ownerId={document.owner_id}
              accessOpen={accessOpen}
              onAccessOpenChange={setAccessDropdownOpen}
              shareDraft={shareDraft}
              setShareDraft={setShareDraft}
              onSaveAccess={() => shareMutation.mutate()}
              isSavingAccess={shareMutation.isPending}
              isLoadingAccess={
                sharesQuery.isLoading || organizationQuery.isLoading
              }
              hasAccessError={sharesQuery.isError || organizationQuery.isError}
              onRetryAccess={() => {
                if (sharesQuery.isError) void sharesQuery.refetch()
                if (organizationQuery.isError) void organizationQuery.refetch()
              }}
              isRetryingAccess={
                sharesQuery.isFetching || organizationQuery.isFetching
              }
              onMoveFolder={moveDocumentToFolder}
              isMovingFolder={updateMutation.isPending}
              onCreateFolder={() => setCreateFolderOpen(true)}
              onToggleFavorite={toggleFavorite}
              isTogglingFavorite={favoriteMutation.isPending}
              onUpdateDates={(dates) => updateMutation.mutate(dates)}
              isUpdatingDates={updateMutation.isPending}
              viewSwitcher={
                <div className="flex items-center gap-2">
                  {documentViewToggle}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddToAgentOpen(true)}
                    data-testid="document-add-to-agent"
                    className="h-7 px-2.5 font-mono text-[0.65rem]"
                  >
                    <Plus className="size-4" />
                    Add to agent
                  </Button>
                  {!editing && canEditDocument && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={enterEdit}
                      data-testid="document-edit"
                      className="h-7 px-2.5 font-mono text-[0.65rem]"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        </div>

        <FolderCreateDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          demo={isDemoMode}
          folders={foldersQuery.data?.data ?? []}
          onCreated={(folder) => moveDocumentToFolder(folder.id)}
        />
        <AddToAgentDialog
          open={addToAgentOpen}
          onOpenChange={setAddToAgentOpen}
          agents={agentsQuery.data?.items ?? []}
          isLoading={agentsQuery.isLoading}
          isAdding={addToAgentMutation.isPending}
          onAdd={(agentSlug) => addToAgentMutation.mutate(agentSlug)}
        />

        <DocumentProvenanceStrip
          rows={documentSessionsQuery.data?.rows ?? []}
          total={documentSessionsQuery.data?.total ?? 0}
          isLoading={documentSessionsQuery.isLoading}
          isError={documentSessionsQuery.isError}
        />

        <div className="pt-6">
          {viewMode === "summary" && (
            <SummaryPane
              document={document}
              editing={editing}
              editState={editState}
              setEditState={setEditState}
            />
          )}

          {viewMode === "details" && (
            <DetailsPane
              document={document}
              editing={editing}
              editState={editState}
              setEditState={setEditState}
            />
          )}
        </div>
      </article>
    </section>
  )
}

function DocumentProvenanceStrip({
  rows,
  total,
  isLoading,
  isError,
}: {
  rows: LedgerSessionRow[]
  total: number
  isLoading: boolean
  isError: boolean
}) {
  return (
    <section className="border-b border-border py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[0.66rem] tracking-[0.01em] text-muted-foreground">
            Sessions / Reused by
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? "Loading session provenance..."
              : isError
                ? "Session provenance unavailable."
                : total > 0
                  ? `${total} session${total === 1 ? "" : "s"} found`
                  : "No sessions recorded yet"}
          </div>
        </div>
        <Link
          to="/v2/ledger"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Open ledger
          <ReceiptText className="size-3.5" />
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {rows.slice(0, 3).map((row) => (
            <Link
              key={row.session_id}
              to="/v2/sessions/$sessionId"
              params={{ sessionId: row.session_id }}
              className="group min-w-0 border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {documentSessionAction(row)} {row.title ?? row.actor_name}
                </span>
                {row.cross_boundary ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 gap-1 normal-case"
                    title="Crossed a person or tool boundary"
                  >
                    <ArrowLeftRight className="size-3" />
                    cross
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                <span>{documentClientLabel(row.client)}</span>
                <span>·</span>
                <span>{formatRelativeTime(row.occurred_at_last)}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {row.specialist_name ?? row.specialist_slug ?? "No profile"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AddToAgentDialog({
  open,
  onOpenChange,
  agents,
  isLoading,
  isAdding,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: AgentSpecialistSummary[]
  isLoading: boolean
  isAdding: boolean
  onAdd: (agentSlug: string) => void
}) {
  const [query, setQuery] = useState("")
  const [selectedSlug, setSelectedSlug] = useState("")

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedSlug("")
    }
  }, [open])

  const filteredAgents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return agents
    return agents.filter((agent) =>
      [agent.name, agent.role, agent.short_description, ...agent.domain_tags]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    )
  }, [agents, query])

  const close = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setQuery("")
      setSelectedSlug("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isAdding && close(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to agent</DialogTitle>
          <DialogDescription>
            Pin this document to an agent profile.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="-translate-y-1/2 pointer-events-none absolute left-3 top-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents"
            className="pl-9"
            aria-label="Search agents"
          />
        </div>

        <div className="max-h-72 overflow-y-auto border border-border">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading agents
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No agents match this search.
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const selected = selectedSlug === agent.slug
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedSlug(agent.slug)}
                  disabled={agent.linked_docs_count >= MAX_LINKS_PER_SPECIALIST}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border p-3 text-left last:border-b-0 hover:bg-muted/50",
                    selected && "bg-[#8447ff]/10",
                    agent.linked_docs_count >= MAX_LINKS_PER_SPECIALIST &&
                      "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 size-4 shrink-0 rounded-full border border-border",
                      selected && "border-[#8447ff] bg-[#8447ff]",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      {agent.name}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                      {agent.short_description}
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {agent.linked_docs_count} documents
                      {agent.linked_docs_count >= MAX_LINKS_PER_SPECIALIST
                        ? " · full"
                        : ""}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => close(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onAdd(selectedSlug)}
            disabled={!selectedSlug || isAdding}
          >
            {isAdding ? "Adding..." : "Add to agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocumentMetadata({
  document,
  folders,
  canManageLibrary,
  canShare,
  canFavorite,
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
  hasAccessError,
  onRetryAccess,
  isRetryingAccess,
  onMoveFolder,
  isMovingFolder,
  onCreateFolder,
  onToggleFavorite,
  isTogglingFavorite,
  onUpdateDates,
  isUpdatingDates,
  viewSwitcher,
}: {
  document: V2DocumentPublic
  folders: V2DocumentFolderPublic[]
  canManageLibrary: boolean
  canShare: boolean
  canFavorite: boolean
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
  hasAccessError: boolean
  onRetryAccess: () => void
  isRetryingAccess: boolean
  onMoveFolder: (folderId: string | null) => void
  isMovingFolder: boolean
  onCreateFolder: () => void
  onToggleFavorite: () => void
  isTogglingFavorite: boolean
  onUpdateDates: (dates: { created_at?: string; updated_at?: string }) => void
  isUpdatingDates: boolean
  viewSwitcher: ReactNode
}) {
  const sharedCount = shares.length

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 py-2 font-mono text-[0.66rem] tracking-[0.01em] text-muted-foreground">
      <DocumentDateField
        label="Created"
        value={document.created_at}
        canEdit={canManageLibrary}
        disabled={isUpdatingDates}
        onChange={(iso) => onUpdateDates({ created_at: iso })}
      />
      <DocumentDateField
        label="Updated"
        value={document.updated_at}
        canEdit={canManageLibrary}
        disabled={isUpdatingDates}
        onChange={(iso) => onUpdateDates({ updated_at: iso })}
      />

      {canManageLibrary ? (
        <FolderPickerDropdown
          folders={folders}
          currentFolderId={document.folder_id ?? null}
          disabled={isMovingFolder}
          onSelect={onMoveFolder}
          onCreateFolder={onCreateFolder}
          triggerLabel={document.folder_name ?? "Unfiled"}
          triggerClassName="h-7 px-2 font-mono text-[0.66rem] tracking-[0.01em] [&_svg]:size-3"
        />
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Folder className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{document.folder_name ?? "Unfiled"}</span>
        </span>
      )}

      {canShare ? (
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
          hasError={hasAccessError}
          onRetry={onRetryAccess}
          isRetrying={isRetryingAccess}
        />
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Share2 className="size-3 text-muted-foreground" />
          {sharedCount > 0
            ? `${sharedCount} member${sharedCount === 1 ? "" : "s"}`
            : "Private"}
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canFavorite || isTogglingFavorite}
        aria-label={document.is_favorite ? "Remove favorite" : "Add favorite"}
        aria-pressed={document.is_favorite}
        onClick={onToggleFavorite}
        data-testid="document-favorite"
        className="h-7 px-2 font-mono text-[0.66rem] tracking-[0.01em]"
      >
        <Star
          className={cn(
            "size-3",
            document.is_favorite
              ? "fill-yellow-400 text-yellow-500"
              : "text-muted-foreground",
          )}
        />
        {document.is_favorite ? "Favorited" : "Favorite"}
      </Button>
      <div className="ml-auto">{viewSwitcher}</div>
    </div>
  )
}

function DocumentDateField({
  label,
  value,
  canEdit,
  disabled,
  onChange,
}: {
  label: string
  value: string | null
  canEdit: boolean
  disabled: boolean
  onChange: (iso: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputValue = value ? value.slice(0, 10) : ""
  const display = `${label} ${formatDateOnly(value)}`

  if (!canEdit) {
    return (
      <span className="whitespace-nowrap text-[0.66rem] text-muted-foreground">
        {display}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        type="date"
        // biome-ignore lint/a11y/noAutofocus: opened by an explicit click, focus belongs here
        autoFocus
        defaultValue={inputValue}
        disabled={disabled}
        aria-label={`${label} date`}
        className="border border-input bg-background px-1.5 py-0.5 text-[0.66rem] text-foreground"
        onBlur={() => setEditing(false)}
        onChange={(event) => {
          const next = event.target.value
          if (next && next !== inputValue) {
            const iso = new Date(`${next}T00:00:00Z`).toISOString()
            onChange(iso)
          }
          setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="cursor-pointer whitespace-nowrap px-1.5 py-0.5 text-[0.66rem] text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => setEditing(true)}
      disabled={disabled}
    >
      {display}
    </button>
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
  hasError,
  onRetry,
  isRetrying,
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
  hasError: boolean
  onRetry: () => void
  isRetrying: boolean
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
          className="h-7 px-2 font-mono text-[0.66rem] tracking-[0.01em] [&_svg]:size-3"
        >
          <Share2 className="size-4" />
          {persistedCount > 0
            ? `${persistedCount} member${persistedCount === 1 ? "" : "s"}`
            : "Private"}
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
          {hasError && (
            <QueryErrorState
              title="Could not load sharing access"
              description="Existing document access is unchanged. Try loading organization members again."
              onRetry={onRetry}
              isRetrying={isRetrying}
              compact
              testId="document-access-load-error"
            />
          )}
          {isLoading && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              Loading access…
            </div>
          )}
          {!isLoading && !hasError && shareableMembers.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No organization members available.
            </div>
          )}
          {!isLoading &&
            !hasError &&
            filteredMembers.length === 0 &&
            shareableMembers.length > 0 && (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No users found.
              </div>
            )}
          {!isLoading &&
            !hasError &&
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
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving || hasError}
          >
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
      className="inline-flex items-center justify-center gap-1.5 border-r border-border px-3 py-1 font-mono text-[0.62rem] tracking-[0.01em] text-muted-foreground transition-colors last:border-r-0 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-muted data-[state=active]:text-foreground"
    >
      {label}
    </button>
  )
}

function SummaryPane({
  document,
  editing,
  editState,
  setEditState,
}: {
  document: V2DocumentPublic
  editing: boolean
  editState: EditableDoc | null
  setEditState: (next: EditableDoc) => void
}) {
  return (
    <div className="space-y-9">
      <section className="space-y-3">
        {editing && editState ? (
          <EditableMainBody
            paragraphs={editState.main_body}
            onChange={(next) => setEditState({ ...editState, main_body: next })}
          />
        ) : (
          <div className="space-y-5 text-[15.5px] leading-[1.65] text-foreground/85 [&_p]:text-pretty [&_strong]:font-semibold [&_strong]:text-foreground">
            {document.main_body.map((paragraph, paragraphIndex) => {
              return (
                <MarkdownBlocks
                  key={paragraphIndex}
                  markdown={paragraph.segments.map((s) => s.text).join("")}
                  variant="plain"
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function paragraphsToMarkdown(paragraphs: V2DocumentParagraph[]): string {
  return paragraphs
    .map((paragraph) => paragraph.segments.map((s) => s.text).join(""))
    .join("\n\n")
}

function markdownToParagraphs(markdown: string): V2DocumentParagraph[] {
  return [{ segments: [{ text: markdown }] }]
}

function detailsSectionsToMarkdown(
  sections: V2DocumentDetailsSection[],
): string {
  return sections
    .map((section) => section.markdown)
    .join("\n\n")
    .trim()
}

function markdownToDetailsSections(
  markdown: string,
  previousSections: V2DocumentDetailsSection[],
): V2DocumentDetailsSection[] {
  return [
    {
      anchor_id: previousSections[0]?.anchor_id || "details",
      markdown,
    },
  ]
}

function EditableMainBody({
  paragraphs,
  onChange,
}: {
  paragraphs: V2DocumentParagraph[]
  onChange: (next: V2DocumentParagraph[]) => void
}) {
  const markdown = useMemo(() => paragraphsToMarkdown(paragraphs), [paragraphs])

  return (
    <RichTextField
      value={markdown}
      onChange={(next) => onChange(markdownToParagraphs(next))}
      className="text-[15.5px] leading-[1.65]"
      data-testid="edit-main-body"
    />
  )
}

function DetailsPane({
  document,
  editing,
  editState,
  setEditState,
}: {
  document: V2DocumentPublic
  editing: boolean
  editState: EditableDoc | null
  setEditState: (next: EditableDoc) => void
}) {
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

  const markdown = detailsSectionsToMarkdown(sections)

  return (
    <section
      aria-label={`${fileName} markdown details`}
      className="overflow-hidden border border-border bg-background"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2 font-mono text-[0.66rem] tracking-[0.01em] text-muted-foreground">
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
      </div>
      <div className="px-5 py-4">
        {editing && editState ? (
          <RichTextField
            value={markdown}
            onChange={(nextMarkdown) =>
              setEditState({
                ...editState,
                details_markdown_sections: markdownToDetailsSections(
                  nextMarkdown,
                  editState.details_markdown_sections,
                ),
              })
            }
            className="text-[15.5px] leading-[1.65]"
            data-testid="edit-details-payload"
          />
        ) : (
          <div className="text-[15.5px] leading-[1.65] text-foreground/85 [&_p]:text-pretty">
            <MarkdownBlocks markdown={markdown} variant="plain" />
          </div>
        )}
      </div>
    </section>
  )
}
