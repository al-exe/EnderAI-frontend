import { useQuery } from "@tanstack/react-query"
import {
  Outlet,
  Link as RouterLink,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { BookOpenText, Component, Home, Search, Shield } from "lucide-react"
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { readV2Documents, type V2DocumentPublic } from "@/api/v2Documents"
import type { UserPublic } from "@/client"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { SidebarCollapseToggle } from "@/components/Common/SidebarCollapseToggle"
import { useDemoMode } from "@/components/demo-mode-provider"
import { DemoModeToggle, V2ModeSwitch } from "@/components/Sidebar/ModeSwitches"
import { User } from "@/components/Sidebar/User"
import { Button } from "@/components/ui/button"
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
  icon: typeof Home
  title: string
  path: string
}

const taskforceItems: TaskforceNavItem[] = [
  { icon: Home, title: "Home", path: "/v2/home" },
  { icon: BookOpenText, title: "Library", path: "/v2/library" },
]

function TaskforceMark() {
  return (
    <RouterLink
      to="/v2/home"
      className="min-w-0 px-1 text-sidebar-foreground group-data-[collapsible=icon]:px-0"
    >
      <span className="text-[1.7rem] font-semibold group-data-[collapsible=icon]:hidden">
        Taskforce
      </span>
      <Component className="hidden size-5 group-data-[collapsible=icon]:block" />
    </RouterLink>
  )
}

function TaskforceNav({ currentUser }: TaskforceShellProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const items = currentUser.is_superuser
    ? [...taskforceItems, { icon: Shield, title: "Admin", path: "/v2/admin" }]
    : taskforceItems

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
            currentPath.startsWith("/v2/library/"))

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
              <RouterLink to={item.path} onClick={handleMenuClick}>
                <item.icon className="size-[18px]" />
                <span>{item.title}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
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

export function TaskforceShell({ currentUser }: TaskforceShellProps) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <TaskforceMark />
        </SidebarHeader>
        <SidebarContent>
          <TaskforceNav currentUser={currentUser} />
        </SidebarContent>
        <SidebarFooter className="gap-1">
          <DemoModeToggle />
          <V2ModeSwitch active enabled={Boolean(currentUser.v2)} />
          <SidebarCollapseToggle />
          <SidebarAppearance />
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

export function TaskforceNoAccess() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg border-l border-border pl-6">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          Taskforce
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">No access</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Taskforce v2 is not enabled for this account.
        </p>
        <Button asChild className="mt-6">
          <RouterLink to="/home">Return to current app</RouterLink>
        </Button>
      </section>
    </main>
  )
}
