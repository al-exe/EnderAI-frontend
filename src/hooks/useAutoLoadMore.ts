import { useEffect, useRef } from "react"

export function useAutoLoadMore<T extends Element>({
  enabled = true,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  root = null,
  rootMargin = "160px 0px",
}: {
  enabled?: boolean
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore: () => void
  root?: Element | null
  rootMargin?: string
}) {
  const sentinelRef = useRef<T | null>(null)

  useEffect(() => {
    if (!enabled || !hasMore || isLoadingMore) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore()
        }
      },
      {
        root,
        rootMargin,
      },
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [enabled, hasMore, isLoadingMore, onLoadMore, root, rootMargin])

  return sentinelRef
}
