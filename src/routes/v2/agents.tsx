import { createFileRoute, Outlet } from "@tanstack/react-router"

// Legacy `/v2/agents` paths now live at `/v2/profiles`. This layout is a
// passthrough; the index and `$slug` children redirect to the canonical route
// so old bookmarks and external links keep working.
export const Route = createFileRoute("/v2/agents")({
  component: () => <Outlet />,
})
