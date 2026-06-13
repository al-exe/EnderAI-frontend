import { createFileRoute, notFound } from "@tanstack/react-router"

import { docsPageForSlug, MarkdownPage } from "@/components/Docs/MarkdownPage"
import { useTheme } from "@/components/theme-provider"

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const page = docsPageForSlug(`/docs/${params.slug}`)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.title ?? "Taskforce"} | Taskforce Docs`,
      },
      {
        name: "description",
        content: `Taskforce documentation: ${loaderData?.title ?? "User guide"}.`,
      },
    ],
  }),
  component: DocsArticle,
})

function DocsArticle() {
  const page = Route.useLoaderData()
  const { resolvedTheme } = useTheme()
  return <MarkdownPage page={page} theme={resolvedTheme} />
}
