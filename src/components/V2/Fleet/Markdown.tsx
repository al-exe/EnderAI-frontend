import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import styles from "./Markdown.module.css"

// Links captured in session prose are external; open them safely in a new tab.
const COMPONENTS: Components = {
  a: ({ children, href, title }) => (
    <a href={href} title={title} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
}

/**
 * Compact GitHub-flavored markdown for session prose (timeline entries, the
 * live activity head, the "Working on" body). Tight block spacing so it sits
 * cleanly inside the agent-detail rows instead of rendering as raw `*`/backtick
 * text. Inherits the surrounding font size and color.
 */
export function Markdown({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={cn(styles.md, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
