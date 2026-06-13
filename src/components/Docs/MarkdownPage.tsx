import { Link } from "@tanstack/react-router"
import { Check, Copy, Pencil } from "lucide-react"
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import styles from "./DocsSite.module.css"
import type { DocsPage } from "./docs-content.generated"
import {
  DOCS_BY_SLUG,
  DOCS_LINK_MAP,
  DOCS_PAGES,
} from "./docs-content.generated"

const GITHUB_GUIDE_URL =
  "https://github.com/al-exe/EnderAI/blob/main/docs/user-guide/"
const DIAGRAM_CHARS = /[│┌┐└┘├┤┬┴┼─▶◀▼▲]/
const SHIKI_LANGUAGES = ["bash", "json", "yaml", "markdown"] as const

type DocsTheme = "light" | "dark"
type ShikiHighlighter = {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string
}

let highlighterPromise: Promise<ShikiHighlighter> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("@shikijs/langs/bash"),
      import("@shikijs/langs/json"),
      import("@shikijs/langs/yaml"),
      import("@shikijs/langs/markdown"),
      import("@shikijs/themes/github-light"),
      import("@shikijs/themes/github-dark"),
    ]).then(
      async ([
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        bash,
        json,
        yaml,
        markdown,
        githubLight,
        githubDark,
      ]) => {
        return (await createHighlighterCore({
          themes: [githubLight.default, githubDark.default],
          langs: [bash.default, json.default, yaml.default, markdown.default],
          engine: createJavaScriptRegexEngine(),
        })) as ShikiHighlighter
      },
    )
  }
  return highlighterPromise
}

function navLabel(page: DocsPage) {
  if (page.slug === "/docs") return "Overview"
  return page.title.replace(/\s+—.*$/, "").replace(/\s*\(.*\)$/, "")
}

function docsLinkProps(href: string) {
  const relative = href.match(/^([\w.-]+\.md)(#.*)?$/)
  if (relative && DOCS_LINK_MAP[relative[1]]) {
    return {
      path: DOCS_LINK_MAP[relative[1]],
      hash: relative[2]?.slice(1),
    }
  }

  if (href.startsWith("/docs")) {
    const [path, hash] = href.split("#")
    return { path, hash }
  }

  return null
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    } catch {
      // Clipboard access can be denied when the document is not focused.
    }
  }
}

function CodeBlock({
  code,
  language,
  theme,
}: {
  code: string
  language: string
  theme: DocsTheme
}) {
  const isDiagram =
    !language ||
    language === "text" ||
    language === "txt" ||
    DIAGRAM_CHARS.test(code)
  const normalizedLanguage = SHIKI_LANGUAGES.includes(
    language as (typeof SHIKI_LANGUAGES)[number],
  )
    ? language
    : ""
  const [highlighted, setHighlighted] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (isDiagram || !normalizedLanguage) {
      setHighlighted("")
      return
    }

    void getHighlighter().then((highlighter) => {
      const html = highlighter.codeToHtml(code, {
        lang: normalizedLanguage,
        theme: theme === "dark" ? "github-dark" : "github-light",
      })
      const inner = html.match(/<code>([\s\S]*)<\/code>/)?.[1] ?? ""
      if (!cancelled) setHighlighted(inner)
    })

    return () => {
      cancelled = true
    }
  }, [code, isDiagram, normalizedLanguage, theme])

  const label = isDiagram ? "diagram" : language || "text"

  return (
    <div
      className={`${styles.codeblock} ${isDiagram ? styles.codeblockPlain : ""}`}
    >
      <div className={styles.codeblockHead}>
        <span className={styles.codeblockLanguage}>
          <span className={styles.codeblockDot} />
          {label}
        </span>
        <button
          className={`${styles.copyButton} ${copied ? styles.copyButtonDone : ""}`}
          type="button"
          onClick={async () => {
            await copyText(code)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          }}
        >
          {copied ? <Check /> : <Copy />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        {highlighted ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki escapes the static guide source before returning highlighted markup.
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}

function MarkdownLink({
  href = "",
  children,
  title,
  className,
  "aria-label": ariaLabel,
}: ComponentPropsWithoutRef<"a">) {
  const internal = docsLinkProps(href)
  if (internal) {
    return (
      <Link
        to={internal.path as never}
        hash={internal.hash}
        title={title}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    )
  }

  if (/^https?:\/\//.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    )
  }

  return (
    <a href={href} title={title} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  )
}

function HeroCards() {
  const cards = [
    [
      "/docs/quickstart",
      "5 min",
      "Connect your agent",
      "Get an MCP-capable agent capturing + reusing work.",
    ],
    [
      "/docs/how-it-works",
      "Concepts",
      "How Taskforce works",
      "Documents, profiles, the reuse loop, the ledger.",
    ],
    [
      "/docs/document-workflow",
      "Build",
      "The document workflow",
      "The begin → update → finish lifecycle your agent runs.",
    ],
    [
      "/docs/tf-flow",
      "Build",
      "The /tf flow",
      "Run the reuse loop visibly, on demand, in Claude Code.",
    ],
    [
      "/docs/metrics",
      "Champion",
      "Metrics & the ROI ledger",
      "Drill from any number down to one auditable event.",
    ],
    [
      "/docs/faq",
      "Reference",
      "FAQ & troubleshooting",
      "Tokens, connection, reuse, privacy — the common ones.",
    ],
  ]

  return (
    <div className={styles.heroCards}>
      {cards.map(([slug, kicker, title, description]) => (
        <Link to={slug as never} key={slug}>
          <span className={styles.heroKicker}>{kicker}</span>
          <span className={styles.heroTitle}>{title}</span>
          <span className={styles.heroDescription}>{description}</span>
        </Link>
      ))}
    </div>
  )
}

function AudienceMeta({ page }: { page: DocsPage }) {
  const label =
    page.audience === "developer"
      ? "Developer"
      : page.audience === "champion"
        ? "Champion"
        : "All readers"
  const badge =
    page.audience === "all"
      ? "all readers"
      : page.audience === "champion"
        ? "champion"
        : "developer"

  return (
    <div className={styles.audienceRow}>
      <span
        className={`${styles.audienceBadge} ${
          page.audience === "developer"
            ? styles.audienceDeveloper
            : page.audience === "champion"
              ? styles.audienceChampion
              : ""
        }`}
      >
        {badge}
      </span>
      <span className={styles.pageMeta}>
        {label} track · {page.slug}
      </span>
    </div>
  )
}

function Pager({ page }: { page: DocsPage }) {
  const index = DOCS_PAGES.findIndex(
    (candidate) => candidate.slug === page.slug,
  )
  const previous = DOCS_PAGES[index - 1]
  const next = DOCS_PAGES[index + 1]

  return (
    <div className={styles.pager}>
      {previous ? (
        <Link className={styles.pagerPrevious} to={previous.slug as never}>
          <span className={styles.pagerDirection}>← Previous</span>
          <span className={styles.pagerTitle}>{navLabel(previous)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link className={styles.pagerNext} to={next.slug as never}>
          <span className={styles.pagerDirection}>Next →</span>
          <span className={styles.pagerTitle}>{navLabel(next)}</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}

export function MarkdownPage({
  page,
  theme,
}: {
  page: DocsPage
  theme: DocsTheme
}) {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const components = useMemo<Components>(
    () => ({
      a: MarkdownLink,
      pre: ({ children }) => children as ReactNode,
      code: ({ className, children }) => {
        const code = String(children).replace(/\n$/, "")
        const language = /language-([\w-]+)/.exec(className ?? "")?.[1] ?? ""
        const isBlock = Boolean(language) || String(children).includes("\n")

        if (!isBlock) return <code className={className}>{children}</code>
        return <CodeBlock code={code} language={language} theme={theme} />
      },
      table: ({ children, ...props }) => (
        <div className={styles.tableWrap}>
          <table {...props}>{children}</table>
        </div>
      ),
    }),
    [theme],
  )

  const isIndex = page.slug === "/docs"

  return (
    <article className={styles.article}>
      <div className={styles.breadcrumbs}>
        <Link to="/docs">Docs</Link>
        {!isIndex && (
          <>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{navLabel(page)}</span>
          </>
        )}
      </div>

      {!isIndex && (
        <div className={styles.pageHead}>
          <AudienceMeta page={page} />
        </div>
      )}

      {isIndex && <HeroCards />}

      <div className={styles.prose}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              {
                behavior: "append",
                content: { type: "text", value: "#" },
                properties: {
                  className: [styles.headingAnchor],
                  ariaLabel: "Link to section",
                },
              },
            ],
          ]}
          components={components}
        >
          {page.body}
        </ReactMarkdown>
      </div>

      <Pager page={page} />

      <div className={styles.editRow}>
        <a
          href={`${GITHUB_GUIDE_URL}${page.file}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Pencil />
          Edit this page on GitHub
        </a>
        <span>·</span>
        <span>{page.file}</span>
      </div>
    </article>
  )
}

export function docsPageForSlug(slug: string) {
  return DOCS_BY_SLUG[slug]
}

export function docsNavLabel(page: DocsPage) {
  return navLabel(page)
}
