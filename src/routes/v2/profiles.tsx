import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ProfileCard } from "@/components/V2/Profiles/ProfileCard"
import {
  PROFILE_FILTERS,
  PROFILES,
  type ProfileFilterKey,
} from "@/components/V2/Profiles/peopleData"
import {
  V2_PAGE_CONTENT,
  V2_PAGE_FRAME,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/v2/profiles")({
  component: TaskforceProfiles,
  head: () => ({
    meta: [
      {
        title: "Taskforce | People",
      },
    ],
  }),
})

function FilterBar({
  active,
  onChange,
}: {
  active: ProfileFilterKey
  onChange: (key: ProfileFilterKey) => void
}) {
  return (
    <div className="flex flex-wrap items-stretch border-y border-border font-mono text-[10px] uppercase tracking-[0.1em]">
      {PROFILE_FILTERS.map((filter) => {
        const count = PROFILES.filter(filter.match).length
        const isActive = filter.key === active
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter.key)}
            className={cn(
              "flex items-center gap-1.5 border-r border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
              isActive && "text-foreground shadow-[inset_0_-2px_0_#8447ff]",
            )}
          >
            {filter.label}
            <span className="text-muted-foreground/60">{count}</span>
          </button>
        )
      })}
      <div className="ml-auto border-l border-border px-3 py-2 text-muted-foreground">
        Sort: reuses driven ↓
      </div>
    </div>
  )
}

function TaskforceProfiles() {
  const [activeFilter, setActiveFilter] = useState<ProfileFilterKey>("all")

  const matcher =
    PROFILE_FILTERS.find((filter) => filter.key === activeFilter)?.match ??
    (() => true)
  const visible = useMemo(() => PROFILES.filter(matcher), [matcher])
  const activeNow = PROFILES.filter((profile) => profile.active).length

  return (
    <section
      className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
    >
      <div className={V2_PAGE_CONTENT}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={V2_TAB_EYEBROW_CLASS}>
              People · {PROFILES.length} members · {activeNow} active now
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Profiles
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm">
              Manage roles
            </Button>
            <Button type="button" size="sm">
              + Invite
            </Button>
          </div>
        </header>

        <FilterBar active={activeFilter} onChange={setActiveFilter} />

        <div
          data-testid="profiles-card-grid"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visible.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No teammates match this filter.
          </p>
        )}
      </div>
    </section>
  )
}
