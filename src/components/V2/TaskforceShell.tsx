import { useQuery } from "@tanstack/react-query"
import {
  Outlet,
  Link as RouterLink,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  LineChart,
  MessageCircle,
  ReceiptText,
  Rocket,
  Search,
  Shield,
} from "lucide-react"
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { readV2Documents, type V2DocumentPublic } from "@/api/v2Documents"
import type { UserPublic } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { useExperimentalMode } from "@/components/experimental-mode-provider"
import {
  DemoModeToggle,
  ExperimentalModeToggle,
} from "@/components/Sidebar/ModeSwitches"
import { User } from "@/components/Sidebar/User"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type TaskforceShellProps = {
  currentUser: UserPublic
}

type TaskforceNavItem = {
  icon: typeof Search
  title: string
  path: string
}

// Ordered by the pipeline's distillation altitude (TF-206): most-distilled
// first (Profiles ← Library ← Ledger), then Metrics as the rollup. Upgrade
// stays at the bottom.
const taskforceItems: TaskforceNavItem[] = [
  { icon: Bot, title: "Profiles", path: "/v2/agents" },
  { icon: BookOpen, title: "Library", path: "/v2/library" },
  { icon: ReceiptText, title: "Ledger", path: "/v2/ledger" },
  { icon: LineChart, title: "Metrics", path: "/v2/metrics" },
  { icon: Rocket, title: "Upgrade", path: "/v2/pricing" },
]

const SIDEBAR_TAB_LABEL_CLASS = "text-[calc(18px*0.85)]"

const TASKFORCE_DISCORD_URL = ""
const EXTRAS_DRAWER_COLLAPSED_STORAGE_KEY = "taskforce.sidebar.extras.collapsed"

function readStoredExtrasDrawerCollapsed() {
  if (typeof window === "undefined") return null

  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      const value = store.getItem(EXTRAS_DRAWER_COLLAPSED_STORAGE_KEY)
      if (value === null) continue
      const parsed = JSON.parse(value)
      if (typeof parsed === "boolean") return parsed
    } catch {
      // Ignore malformed or inaccessible storage and keep checking fallbacks.
    }
  }

  return null
}

function writeExtrasDrawerCollapsed(isCollapsed: boolean) {
  if (typeof window === "undefined") return
  const value = JSON.stringify(isCollapsed)

  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      store.setItem(EXTRAS_DRAWER_COLLAPSED_STORAGE_KEY, value)
    } catch {
      // Storage can be disabled in private/sandboxed contexts; keep UI usable.
    }
  }
}

function TaskforceMark() {
  return (
    <RouterLink
      to="/v2/library"
      className="flex min-w-0 items-center gap-3 px-1 text-sidebar-foreground group-data-[collapsible=icon]:px-0"
    >
      <img
        src="/assets/brand/tf-logo.svg"
        alt=""
        className="size-8 shrink-0 group-data-[collapsible=icon]:size-7"
      />
      <span className="text-[1.55rem] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
        Taskforce
      </span>
    </RouterLink>
  )
}

function TaskforceNav({ currentUser }: TaskforceShellProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const items = [
    ...taskforceItems,
    ...(currentUser.is_superuser
      ? [{ icon: Shield, title: "Admin", path: "/v2/admin" }]
      : []),
  ]

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenu className="px-2">
      {items.map((item) => {
        const isActive =
          currentPath === item.path ||
          (item.path === "/v2/library" &&
            currentPath.startsWith("/v2/library/")) ||
          (item.path === "/v2/agents" && currentPath.startsWith("/v2/agents/"))

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
              <RouterLink to={item.path} onClick={handleMenuClick}>
                <item.icon className="size-[18px]" />
                <span className={SIDEBAR_TAB_LABEL_CLASS}>{item.title}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function DiscordButton() {
  const content = (
    <>
      <MessageCircle className="size-[18px] text-muted-foreground transition-colors" />
      <span>Discord</span>
    </>
  )

  if (TASKFORCE_DISCORD_URL) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Join Discord" asChild>
          <a
            href={TASKFORCE_DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="taskforce-discord-link"
          >
            {content}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        tooltip="Discord link coming soon"
        data-testid="taskforce-discord-placeholder"
        aria-disabled="true"
        className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
      >
        {content}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarUtilityDrawer({
  showInternalModes,
}: {
  showInternalModes: boolean
}) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => readStoredExtrasDrawerCollapsed() ?? false,
  )
  const dragStartYRef = useRef<number | null>(null)
  const didDragRef = useRef(false)

  useEffect(() => {
    writeExtrasDrawerCollapsed(isCollapsed)
  }, [isCollapsed])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = event.clientY
    didDragRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return
    const deltaY = event.clientY - dragStartYRef.current
    if (Math.abs(deltaY) < 32) return

    didDragRef.current = true
    setIsCollapsed(deltaY > 0)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleHandleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    setIsCollapsed((collapsed) => !collapsed)
  }

  return (
    <div
      data-testid="taskforce-sidebar-utility-drawer"
      data-collapsed={isCollapsed}
      className="border-sidebar-border/80 border-t pt-1 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-12"
    >
      <button
        type="button"
        data-testid="taskforce-sidebar-utility-handle"
        aria-expanded={!isCollapsed}
        aria-label="Sidebar utilities"
        className="flex h-8 w-full cursor-ns-resize items-center justify-between rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        onClick={handleHandleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <GripHorizontal className="size-4" />
        <span className="group-data-[collapsible=icon]:hidden">
          {isCollapsed ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>
      {!isCollapsed && (
        <SidebarMenu className="mt-1">
          <DiscordButton />
          {showInternalModes && (
            <>
              <ExperimentalModeToggle />
              <DemoModeToggle />
            </>
          )}
        </SidebarMenu>
      )}
    </div>
  )
}

type DocumentSearchMatch = {
  document: V2DocumentPublic
  snippet: string
}

const MAX_SEARCH_RESULTS = 8

function collectSearchableFields(document: V2DocumentPublic): string[] {
  const bodyText = document.main_body
    .map((paragraph) =>
      paragraph.segments.map((segment) => segment.text).join(""),
    )
    .join("\n")
  const detailsText = document.details_markdown_sections
    .map((section) => section.markdown)
    .join("\n")
  return [
    document.title,
    document.description,
    document.human_summary,
    document.ai_generated_summary,
    bodyText,
    detailsText,
  ]
}

function extractSnippet(text: string, matchIndex: number, matchLength: number) {
  const start = Math.max(0, matchIndex - 30)
  const end = Math.min(text.length, matchIndex + matchLength + 80)
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim()
  if (start > 0) snippet = `…${snippet}`
  if (end < text.length) snippet = `${snippet}…`
  return snippet
}

function findMatch(
  document: V2DocumentPublic,
  needle: string,
): DocumentSearchMatch | null {
  for (const text of collectSearchableFields(document)) {
    const index = text.toLowerCase().indexOf(needle)
    if (index !== -1) {
      const snippet =
        text === document.title
          ? document.description
          : extractSnippet(text, index, needle.length)
      return { document, snippet }
    }
  }
  return null
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase()
  if (!needle) return <>{text}</>

  const nodes: React.ReactNode[] = []
  const lower = text.toLowerCase()
  let cursor = 0
  let key = 0

  while (cursor < text.length) {
    const index = lower.indexOf(needle, cursor)
    if (index === -1) {
      nodes.push(<Fragment key={key++}>{text.slice(cursor)}</Fragment>)
      break
    }
    if (index > cursor) {
      nodes.push(<Fragment key={key++}>{text.slice(cursor, index)}</Fragment>)
    }
    nodes.push(
      <mark
        key={key++}
        className="rounded-sm bg-yellow-200/80 px-0.5 text-foreground dark:bg-yellow-500/30 dark:text-yellow-50"
      >
        {text.slice(index, index + needle.length)}
      </mark>,
    )
    cursor = index + needle.length
  }

  return <>{nodes}</>
}

function DocumentSearch() {
  const { isDemoMode } = useDemoMode()
  const navigate = useNavigate()
  const router = useRouterState()
  const pathname = router.location.pathname
  const containerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<number | null>(null)
  const lastQueryRef = useRef("")
  const lastPathnameRef = useRef(pathname)
  const listboxId = useId()

  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const trimmedQuery = query.trim()

  const documentsQuery = useQuery({
    queryKey: ["v2-documents", { demo: isDemoMode }],
    queryFn: () => readV2Documents({ demo: isDemoMode }),
    enabled: isDemoMode,
  })
  const documents = documentsQuery.data?.data ?? []

  const results = useMemo<DocumentSearchMatch[]>(() => {
    if (!isDemoMode || !trimmedQuery) return []
    const needle = trimmedQuery.toLowerCase()
    const matches: DocumentSearchMatch[] = []
    for (const document of documents) {
      const match = findMatch(document, needle)
      if (match) {
        matches.push(match)
        if (matches.length >= MAX_SEARCH_RESULTS) break
      }
    }
    return matches
  }, [isDemoMode, trimmedQuery, documents])

  useEffect(() => {
    if (lastQueryRef.current === trimmedQuery) return
    lastQueryRef.current = trimmedQuery
    setActiveIndex(0)
  }, [trimmedQuery])

  useEffect(() => {
    if (lastPathnameRef.current === pathname) return
    lastPathnameRef.current = pathname
    setQuery("")
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const showHint = isOpen && trimmedQuery.length > 0 && !isDemoMode
  const showResults = isOpen && isDemoMode && trimmedQuery.length > 0
  const dropdownOpen = showHint || showResults
  const activeResult = showResults ? results[activeIndex] : undefined

  const openDocument = (documentId: string) => {
    setQuery("")
    setIsOpen(false)
    navigate({
      to: "/v2/library/$documentId",
      params: { documentId },
    })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (dropdownOpen) {
        event.preventDefault()
        setIsOpen(false)
      }
      return
    }

    if (!showResults || results.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === "Enter") {
      const next = results[activeIndex]
      if (next) {
        event.preventDefault()
        openDocument(next.document.id)
      }
    }
  }

  const handleBlur = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
      }
    }, 80)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-label="Search documents"
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? listboxId : undefined}
        aria-activedescendant={
          activeResult ? `${listboxId}-option-${activeIndex}` : undefined
        }
        className="pl-9"
        data-testid="v2-document-lookup-input"
        placeholder="Search documents"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (blurTimeoutRef.current !== null) {
            window.clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
          }
          setIsOpen(true)
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {dropdownOpen && (
        <div
          id={listboxId}
          data-testid="v2-document-lookup-results"
          className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
        >
          {showHint && (
            <p
              data-testid="v2-document-lookup-hint"
              className="px-4 py-3 text-sm text-muted-foreground"
            >
              Turn on demo mode to search documents.
            </p>
          )}
          {showResults && results.length === 0 && (
            <p
              data-testid="v2-document-lookup-empty"
              className="px-4 py-3 text-sm text-muted-foreground"
            >
              No documents match "{trimmedQuery}".
            </p>
          )}
          {showResults && results.length > 0 && (
            <div
              role="listbox"
              aria-label="Document search results"
              className="max-h-[28rem] overflow-y-auto py-1"
            >
              {results.map((result, index) => (
                <button
                  key={result.document.id}
                  type="button"
                  role="option"
                  id={`${listboxId}-option-${index}`}
                  data-testid={`v2-document-lookup-result-${result.document.id}`}
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => openDocument(result.document.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors",
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60",
                  )}
                >
                  <span className="text-sm font-medium leading-5">
                    <HighlightedText
                      text={result.document.title}
                      query={trimmedQuery}
                    />
                  </span>
                  <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    <HighlightedText
                      text={result.snippet}
                      query={trimmedQuery}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InternalModeAccessGate({ currentUser }: TaskforceShellProps) {
  const { setDemoMode } = useDemoMode()
  const { setExperimentalMode } = useExperimentalMode()

  useEffect(() => {
    if (currentUser.is_superuser) return
    setDemoMode(false)
    setExperimentalMode(false)
  }, [currentUser.is_superuser, setDemoMode, setExperimentalMode])

  return null
}

export function TaskforceShell({ currentUser }: TaskforceShellProps) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <InternalModeAccessGate currentUser={currentUser} />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <TaskforceMark />
        </SidebarHeader>
        <SidebarContent>
          <TaskforceNav currentUser={currentUser} />
        </SidebarContent>
        <SidebarFooter className="gap-1">
          <SidebarUtilityDrawer
            showInternalModes={Boolean(currentUser.is_superuser)}
          />
          <User user={currentUser} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="shrink-0 border-b bg-background px-5 md:px-8">
          <div className="flex h-16 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <DocumentSearch />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 md:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

type TaskforcePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
}

export function TaskforcePlaceholder({
  eyebrow,
  title,
  description,
}: TaskforcePlaceholderProps) {
  return (
    <section className="flex min-h-0 flex-1 items-start">
      <div className="w-full max-w-3xl border-l border-border pl-5">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  )
}
