import { createFileRoute, redirect } from "@tanstack/react-router"

// Legacy V1 path — V1 (topics/cases/skills) was removed; keep a redirect so
// old links/bookmarks resolve into the V2 app.
export const Route = createFileRoute("/cases")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/library" })
  },
})
