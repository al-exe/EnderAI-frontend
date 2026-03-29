const DEFAULT_MAX_DISPLAY_LENGTH = 255

const REPO_PATH_ROOTS = new Set([
  "app",
  "App",
  "api",
  "Api",
  "backend",
  "Backend",
  "docs",
  "frontend",
  "Frontend",
  "mcp",
  "packages",
  "src",
  "tests",
])

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim()
}

export function truncateWithEllipsis(
  value: string | null | undefined,
  maxLength = DEFAULT_MAX_DISPLAY_LENGTH,
): string {
  const normalized = normalizeText(value)
  if (normalized.length <= maxLength) return normalized

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function looksLikePath(value: string): boolean {
  return value.includes("/") || value.includes("\\")
}

function formatSentenceCase(value: string): string {
  if (!/\s/.test(value)) return value

  const normalized = value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part
      if (part.toUpperCase() === part && /[A-Z]/.test(part)) return part
      return part.toLowerCase()
    })
    .join("")

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
}

function normalizePath(value: string): string {
  const normalized = normalizeText(value).replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)

  if (segments.length === 0) return normalized

  const repoRootIndex = segments.findIndex((segment) =>
    REPO_PATH_ROOTS.has(segment),
  )

  if (repoRootIndex > 0) {
    return segments.slice(repoRootIndex).join("/")
  }

  if (!normalized.startsWith("/")) {
    return segments.join("/")
  }

  return segments.slice(-Math.min(4, segments.length)).join("/")
}

export function getClippedTextDisplay(
  value: string | null | undefined,
  maxLength = DEFAULT_MAX_DISPLAY_LENGTH,
): { label: string; title: string } {
  const full = normalizeText(value)

  return {
    label: truncateWithEllipsis(full, maxLength),
    title: full,
  }
}

export function getSignalChipDisplay(value: string | null | undefined): {
  label: string
  title: string
} {
  const full = normalizeText(value)
  if (!full) {
    return { label: "", title: "" }
  }

  if (!looksLikePath(full)) {
    const sentenceCased = formatSentenceCase(full)

    return {
      label: truncateWithEllipsis(sentenceCased),
      title: sentenceCased,
    }
  }

  const normalizedPath = normalizePath(full)
  const pathSegments = normalizedPath.split("/").filter(Boolean)
  const basename = pathSegments[pathSegments.length - 1] ?? normalizedPath

  return {
    label:
      basename && basename !== normalizedPath
        ? `…/${basename}`
        : truncateWithEllipsis(normalizedPath),
    title: normalizedPath,
  }
}
