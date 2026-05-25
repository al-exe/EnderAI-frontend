import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiError, OpenAPI } from "./client"
import { invalidateTaskforceSession } from "./lib/taskforceSession"
import { DemoModeProvider } from "./components/demo-mode-provider"
import { ExperimentalModeProvider } from "./components/experimental-mode-provider"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import { routeTree } from "./routeTree.gen"

OpenAPI.BASE = import.meta.env.VITE_API_URL
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const basePath =
  import.meta.env.BASE_URL !== "/" && import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL

const appPath = (path: string) =>
  basePath === "/" ? path : `${basePath}${path}`

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("access_token")
    invalidateTaskforceSession()
    window.location.href = appPath("/login")
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree, basepath: basePath })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// GitHub Pages deep-link support: see `public/404.html`.
// If we were redirected from a 404, navigate to the originally requested route.
const redirectParam = new URLSearchParams(window.location.search).get("p")
if (redirectParam) {
  const url = new URL(window.location.href)
  url.searchParams.delete("p")
  window.history.replaceState(null, "", url.pathname + url.search + url.hash)
  void router.navigate({ to: redirectParam, replace: true })
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DemoModeProvider>
        <ExperimentalModeProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster richColors closeButton />
          </QueryClientProvider>
        </ExperimentalModeProvider>
      </DemoModeProvider>
    </ThemeProvider>
  </StrictMode>,
)
