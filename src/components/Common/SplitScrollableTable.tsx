import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
    return
  }
  ref.current = value
}

interface SplitScrollableTableProps {
  header: React.ReactNode
  body: React.ReactNode
  viewportRef?: React.Ref<HTMLDivElement | null>
  className?: string
  headerClassName?: string
  bodyClassName?: string
}

export function SplitScrollableTable({
  header,
  body,
  viewportRef,
  className,
  headerClassName,
  bodyClassName,
}: SplitScrollableTableProps) {
  const headerTrackRef = useRef<HTMLDivElement | null>(null)
  const bodyViewportRef = useRef<HTMLDivElement | null>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  const syncHeader = useCallback((scrollLeft: number) => {
    if (!headerTrackRef.current) return
    headerTrackRef.current.style.transform = `translateX(-${scrollLeft}px)`
  }, [])

  const syncLayout = useCallback(() => {
    const viewport = bodyViewportRef.current
    if (!viewport) return
    syncHeader(viewport.scrollLeft)
    setScrollbarWidth(viewport.offsetWidth - viewport.clientWidth)
  }, [syncHeader])

  const setViewportNode = useCallback(
    (node: HTMLDivElement | null) => {
      bodyViewportRef.current = node
      assignRef(viewportRef, node)
      if (node) {
        setScrollbarWidth(node.offsetWidth - node.clientWidth)
      }
    },
    [viewportRef],
  )

  useEffect(() => {
    syncLayout()
  })

  useEffect(() => {
    const viewport = bodyViewportRef.current
    if (!viewport || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => syncLayout())
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [syncLayout])

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border",
        className,
      )}
    >
      <div
        className={cn("overflow-hidden border-b bg-muted/50", headerClassName)}
        style={{ paddingRight: scrollbarWidth }}
      >
        <div
          ref={headerTrackRef}
          className="w-max min-w-full will-change-transform"
        >
          {header}
        </div>
      </div>
      <div
        ref={setViewportNode}
        className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}
        onScroll={(event) => syncHeader(event.currentTarget.scrollLeft)}
      >
        {body}
      </div>
    </div>
  )
}
