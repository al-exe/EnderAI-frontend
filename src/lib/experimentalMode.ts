export const EXPERIMENTAL_MODE_STORAGE_KEY = "taskforce-experimental-mode"

export const CURRENT_FRONTEND_HOME = "/home"
export const EXPERIMENTAL_FRONTEND_HOME = "/v2/library"

const routePairs = [
  { current: "/home", experimental: "/v2/library" },
  { current: "/topics", experimental: "/v2/library" },
  { current: "/cases", experimental: "/v2/library" },
  { current: "/skills", experimental: "/v2/agents" },
  { current: "/admin", experimental: "/v2/admin" },
  { current: "/settings", experimental: "/v2/settings" },
] as const

export function readExperimentalModePreference(
  storageKey = EXPERIMENTAL_MODE_STORAGE_KEY,
) {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(storageKey) === "true"
}

export function writeExperimentalModePreference(
  enabled: boolean,
  storageKey = EXPERIMENTAL_MODE_STORAGE_KEY,
) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey, String(enabled))
}

export function getDefaultFrontendPath() {
  return readExperimentalModePreference()
    ? EXPERIMENTAL_FRONTEND_HOME
    : CURRENT_FRONTEND_HOME
}

function matchesRoute(pathname: string, routePath: string) {
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}

export function getExperimentalFrontendPath(pathname: string) {
  if (pathname.startsWith("/v2")) return pathname

  const match = routePairs.find(({ current }) =>
    matchesRoute(pathname, current),
  )
  return match?.experimental ?? EXPERIMENTAL_FRONTEND_HOME
}

export function getCurrentFrontendPath(pathname: string) {
  if (!pathname.startsWith("/v2")) return pathname

  const match = routePairs.find(({ experimental }) =>
    matchesRoute(pathname, experimental),
  )
  return match?.current ?? CURRENT_FRONTEND_HOME
}
