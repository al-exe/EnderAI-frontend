export const EXPERIMENTAL_MODE_STORAGE_KEY = "taskforce-experimental-mode"
export const DEFAULT_FRONTEND_PATH = "/v2/library"

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
  return DEFAULT_FRONTEND_PATH
}
