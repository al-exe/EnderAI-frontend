import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { Github, Menu, Moon, Search, Sun, X } from "lucide-react"
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useTheme } from "@/components/theme-provider"
import styles from "./DocsSite.module.css"
import {
  DOCS_BY_SLUG,
  DOCS_PAGES,
  type DocsAudience,
  type DocsPage,
} from "./docs-content.generated"
import { docsNavLabel } from "./MarkdownPage"

const GROUPS = [
  { label: "Get started", slugs: ["/docs", "/docs/quickstart"] },
  { label: "Concepts", slugs: ["/docs/how-it-works"] },
  {
    label: "Using Taskforce",
    slugs: ["/docs/document-workflow", "/docs/tf-flow", "/docs/web-app"],
  },
  {
    label: "For champions",
    slugs: ["/docs/metrics", "/docs/team-rollout"],
  },
  {
    label: "Reference",
    slugs: ["/docs/best-practices", "/docs/faq"],
  },
]

const GITHUB_GUIDE_URL =
  "https://github.com/al-exe/EnderAI/tree/main/docs/user-guide"

type SearchResult = {
  type: "page" | "heading"
  title: string
  subtitle: string
  slug: string
  hash?: string
}

const SEARCH_INDEX: SearchResult[] = DOCS_PAGES.flatMap((page) => [
  {
    type: "page",
    title: docsNavLabel(page),
    subtitle: page.title,
    slug: page.slug,
  },
  ...page.headings.map((heading) => ({
    type: "heading" as const,
    title: heading.text,
    subtitle: docsNavLabel(page),
    slug: page.slug,
    hash: heading.id,
  })),
])

function pageFromPath(pathname: string) {
  return DOCS_BY_SLUG[pathname] ?? DOCS_BY_SLUG["/docs"]
}

function Sidebar({
  activePage,
  audience,
  onAudienceChange,
  onNavigate,
}: {
  activePage: DocsPage
  audience: DocsAudience
  onAudienceChange: (audience: DocsAudience) => void
  onNavigate: () => void
}) {
  return (
    <>
      <div className={styles.trackFilter}>
        <div className={styles.filterLabel}>Track</div>
        <div className={styles.segmentedControl}>
          {[
            ["all", "All"],
            ["developer", "Dev"],
            ["champion", "Champion"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={audience === value ? styles.segmentActive : ""}
              onClick={() => onAudienceChange(value as DocsAudience)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {GROUPS.map((group) => (
        <nav
          className={styles.navGroup}
          aria-label={group.label}
          key={group.label}
        >
          <span className={styles.navGroupLabel}>{group.label}</span>
          {group.slugs.map((slug) => {
            const page = DOCS_BY_SLUG[slug]
            if (!page) return null
            const dimmed =
              audience !== "all" &&
              page.audience !== "all" &&
              page.audience !== audience

            return (
              <Link
                to={page.slug as never}
                key={page.slug}
                onClick={onNavigate}
                className={`${styles.navItem} ${
                  page.slug === activePage.slug ? styles.navItemActive : ""
                } ${dimmed ? styles.navItemDimmed : ""}`}
              >
                <span className={styles.navIndex}>
                  {String(page.order).padStart(2, "0")}
                </span>
                <span className={styles.navLabel}>{docsNavLabel(page)}</span>
                {page.audience !== "all" && (
                  <span
                    className={`${styles.audienceBadge} ${
                      page.audience === "developer"
                        ? styles.audienceDeveloper
                        : styles.audienceChampion
                    }`}
                  >
                    {page.audience === "developer" ? "dev" : "lead"}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      ))}

      <div className={styles.sidebarFooter}>
        Taskforce User Guide
        <br />
        Source:{" "}
        <a href={GITHUB_GUIDE_URL} target="_blank" rel="noopener noreferrer">
          EnderAI/docs/user-guide
        </a>
        <br />
        10 pages · GFM
      </div>
    </>
  )
}

function OnThisPage({
  page,
  activeHeading,
}: {
  page: DocsPage
  activeHeading: string
}) {
  if (!page.headings.length) return null

  return (
    <>
      <div className={styles.tocHeading}>On this page</div>
      <ul>
        {page.headings.map((heading) => (
          <li key={heading.id}>
            <Link
              to={page.slug as never}
              hash={heading.id}
              className={`${heading.level === 3 ? styles.tocH3 : ""} ${
                activeHeading === heading.id ? styles.tocActive : ""
              }`}
            >
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

function SearchPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return SEARCH_INDEX.filter((result) => result.type === "page")
    }
    return SEARCH_INDEX.filter(
      (result) =>
        result.title.toLowerCase().includes(normalized) ||
        result.subtitle.toLowerCase().includes(normalized),
    ).slice(0, 24)
  }, [query])

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSelectedIndex(0)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [])

  const choose = (result: SearchResult) => {
    void navigate({
      to: result.slug as never,
      hash: result.hash,
    })
    onClose()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault()
      setSelectedIndex((current) => (current + 1) % results.length)
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault()
      setSelectedIndex(
        (current) => (current - 1 + results.length) % results.length,
      )
    } else if (event.key === "Enter" && results[selectedIndex]) {
      event.preventDefault()
      choose(results[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div className={styles.paletteScrim}>
      <button
        type="button"
        className={styles.paletteBackdrop}
        aria-label="Close docs search"
        onClick={onClose}
      />
      <div className={styles.palette} role="dialog" aria-label="Search docs">
        <div className={styles.paletteInput}>
          <Search />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and sections…"
            autoComplete="off"
            spellCheck={false}
          />
          <span className={styles.paletteEscape}>ESC</span>
        </div>
        <div className={styles.paletteResults}>
          {!query && <div className={styles.paletteGroup}>Pages</div>}
          {results.length ? (
            results.map((result, index) => (
              <button
                type="button"
                key={`${result.slug}-${result.hash ?? "page"}`}
                className={`${styles.paletteResult} ${
                  selectedIndex === index ? styles.paletteResultSelected : ""
                }`}
                onMouseMove={() => setSelectedIndex(index)}
                onClick={() => choose(result)}
              >
                <span className={styles.paletteResultIcon}>
                  {result.type === "page" ? "›" : "#"}
                </span>
                <span className={styles.paletteResultTitle}>
                  {result.title}
                  {result.type === "page" &&
                    result.subtitle !== result.title && (
                      <span className={styles.paletteResultSubtitle}>
                        {result.subtitle}
                      </span>
                    )}
                </span>
                {result.type === "heading" && (
                  <span className={styles.paletteResultPage}>
                    {result.subtitle}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className={styles.paletteEmpty}>No matches for “{query}”</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DocsSite() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activePage = pageFromPath(pathname)
  const { resolvedTheme, setTheme } = useTheme()
  const initializedTheme = useRef(false)
  const [audience, setAudience] = useState<DocsAudience>(() => {
    const saved = localStorage.getItem("tf_docs_aud")
    return saved === "developer" || saved === "champion" ? saved : "all"
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [activeHeading, setActiveHeading] = useState(
    activePage.headings[0]?.id ?? "",
  )

  useEffect(() => {
    if (initializedTheme.current) return
    initializedTheme.current = true
    const saved = localStorage.getItem("tf-docs-theme")
    const preferred =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
    setTheme(preferred)
  }, [setTheme])

  useEffect(() => {
    setDrawerOpen(false)
    setActiveHeading(activePage.headings[0]?.id ?? "")
  }, [activePage])

  useEffect(() => {
    const headings = activePage.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((heading): heading is HTMLElement => Boolean(heading))
    if (!headings.length) return

    const onScroll = () => {
      const position = window.scrollY + 110
      let current = headings[0]
      for (const heading of headings) {
        if (heading.offsetTop <= position) current = heading
      }
      setActiveHeading(current.id)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [activePage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.matches("input, textarea, select") || target?.isContentEditable
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      } else if (event.key === "/" && !paletteOpen && !isTyping) {
        event.preventDefault()
        setPaletteOpen(true)
      } else if (event.key === "Escape" && !paletteOpen) {
        setDrawerOpen(false)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [paletteOpen])

  const changeAudience = (next: DocsAudience) => {
    setAudience(next)
    localStorage.setItem("tf_docs_aud", next)
  }

  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    localStorage.setItem("tf-docs-theme", next)
    setTheme(next)
  }

  return (
    <div className={styles.docsSite} data-testid="docs-site">
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label={
            drawerOpen ? "Close documentation menu" : "Open documentation menu"
          }
          onClick={() => setDrawerOpen((current) => !current)}
        >
          {drawerOpen ? <X /> : <Menu />}
        </button>
        <Link className={styles.brand} to="/docs">
          <img
            src="/assets/brand/tf-icon-filled.svg"
            alt=""
            className={styles.brandMarkLight}
          />
          <img
            src="/assets/brand/tf-icon-filled-dark.svg"
            alt=""
            className={styles.brandMarkDark}
          />
          Taskforce
          <span className={styles.brandTag}>Docs</span>
        </Link>
        <button
          className={styles.searchButton}
          type="button"
          onClick={() => setPaletteOpen(true)}
        >
          <Search />
          <span className={styles.searchLabel}>Search the docs…</span>
          <span className={styles.searchShortcut}>⌘K</span>
        </button>
        <div className={styles.topbarSpacer} />
        <div className={styles.topbarLinks}>
          <Link className={styles.pricingLink} to="/pricing">
            Pricing
          </Link>
          <button
            className={styles.iconButton}
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          </button>
          <a
            className={styles.iconButton}
            href={GITHUB_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Taskforce user guide on GitHub"
          >
            <Github />
          </a>
          <Link className={styles.openTaskforce} to="/login">
            Open Taskforce →
          </Link>
        </div>
      </header>

      <button
        type="button"
        aria-label="Close documentation menu"
        className={`${styles.drawerScrim} ${
          drawerOpen ? styles.drawerScrimOpen : ""
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      <div className={styles.shell}>
        <aside
          className={`${styles.sidebar} ${
            drawerOpen ? styles.sidebarOpen : ""
          }`}
          aria-label="Documentation navigation"
        >
          <Sidebar
            activePage={activePage}
            audience={audience}
            onAudienceChange={changeAudience}
            onNavigate={() => setDrawerOpen(false)}
          />
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>

        <aside className={styles.toc} aria-label="On this page">
          <OnThisPage page={activePage} activeHeading={activeHeading} />
        </aside>
      </div>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
