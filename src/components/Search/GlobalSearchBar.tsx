import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Loader2, Search as SearchIcon } from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"

import { readGlobalSearch, type SearchHitPublic } from "@/api/search"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import styles from "./GlobalSearchBar.module.css"

const MIN_QUERY_LENGTH = 2
const LIMIT_PER_KIND = 5
const DEBOUNCE_MS = 200

type SearchEntry = {
  group: "Topics" | "Cases"
  hit: SearchHitPublic
}

export function GlobalSearchBar() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const searchQuery = useQuery({
    queryKey: ["globalSearch", debouncedQuery],
    queryFn: () => readGlobalSearch(debouncedQuery, LIMIT_PER_KIND),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 15_000,
  })

  const entries = useMemo<SearchEntry[]>(() => {
    const topics = (searchQuery.data?.topics ?? []).map((hit) => ({
      group: "Topics" as const,
      hit,
    }))
    const cases = (searchQuery.data?.cases ?? []).map((hit) => ({
      group: "Cases" as const,
      hit,
    }))

    return [...topics, ...cases]
  }, [searchQuery.data])

  useEffect(() => {
    if (!isFocused || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setActiveIndex(-1)
      return
    }

    setActiveIndex(entries.length > 0 ? 0 : -1)
  }, [debouncedQuery, entries.length, isFocused])

  const isOpen = isFocused && query.trim().length >= MIN_QUERY_LENGTH

  const selectHit = (hit: SearchHitPublic) => {
    setQuery("")
    setDebouncedQuery("")
    setIsFocused(false)
    setActiveIndex(-1)

    if (hit.kind === "topic") {
      void navigate({
        to: "/topics",
        search: {
          topicId: hit.route_search.topicId ?? hit.id,
        },
      })
      return
    }

    void navigate({
      to: "/cases",
      search: {
        caseId: hit.route_search.caseId ?? hit.id,
      },
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) =>
        entries.length === 0 ? -1 : Math.min(current + 1, entries.length - 1),
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) =>
        entries.length === 0 ? -1 : Math.max(current - 1, 0),
      )
      return
    }

    if (event.key === "Enter") {
      const selectedEntry = entries[activeIndex] ?? entries[0]
      if (!selectedEntry) return
      event.preventDefault()
      selectHit(selectedEntry.hit)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsFocused(false)
      setActiveIndex(-1)
    }
  }

  const renderGroup = (
    title: "Topics" | "Cases",
    results: SearchHitPublic[],
    startIndex: number,
  ) => {
    if (results.length === 0) return null

    return (
      <div className={styles.group}>
        <div className={styles.groupTitle}>{title}</div>
        <div className={styles.groupList}>
          {results.map((hit, index) => {
            const entryIndex = startIndex + index
            const isActive = entryIndex === activeIndex

            return (
              <button
                key={hit.id}
                type="button"
                className={cn(
                  styles.resultButton,
                  isActive
                    ? styles.resultButtonActive
                    : styles.resultButtonInactive,
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(entryIndex)}
                onClick={() => selectHit(hit)}
              >
                <div className={styles.resultRow}>
                  <span className={styles.resultTitle}>{hit.title}</span>
                  {hit.subtitle ? (
                    <span className={styles.resultSubtitle}>
                      {hit.subtitle}
                    </span>
                  ) : null}
                </div>
                {hit.excerpt ? (
                  <p className={styles.resultExcerpt}>{hit.excerpt}</p>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const topicResults = searchQuery.data?.topics ?? []
  const caseResults = searchQuery.data?.cases ?? []

  return (
    <div
      ref={containerRef}
      data-testid="global-search-container"
      className={styles.container}
    >
      <div className={styles.inputWrap}>
        <SearchIcon className={styles.searchIcon} />
        <Input
          value={query}
          placeholder="Search Topics and Cases"
          className={styles.input}
          data-testid="global-search-input"
          onFocus={() => setIsFocused(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {searchQuery.isFetching ? <Loader2 className={styles.loader} /> : null}
      </div>

      {isOpen ? (
        <Card className={styles.resultsCard}>
          <CardContent className={styles.resultsContent}>
            {searchQuery.isFetching ? (
              <div className={styles.status}>Searching Topics and Cases…</div>
            ) : entries.length === 0 ? (
              <div className={styles.status}>No Topics or Cases matched.</div>
            ) : (
              <div>
                {renderGroup("Topics", topicResults, 0)}
                {renderGroup("Cases", caseResults, topicResults.length)}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
