import { createFileRoute, Outlet } from "@tanstack/react-router"

// Legacy `/v2/fleet` paths now live at `/v2/sessions`. This layout is a
// passthrough; the index and `$sessionId` children redirect to the new route
// so old bookmarks and external links keep working.
export const Route = createFileRoute("/v2/fleet")({
  component: () => <Outlet />,
})
