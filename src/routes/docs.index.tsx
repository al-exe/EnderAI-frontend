import { createFileRoute } from "@tanstack/react-router"

import { docsPageForSlug, MarkdownPage } from "@/components/Docs/MarkdownPage"
import { useTheme } from "@/components/theme-provider"

const page = docsPageForSlug("/docs")

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
})

function DocsIndex() {
  const { resolvedTheme } = useTheme()
  return <MarkdownPage page={page} theme={resolvedTheme} />
}
