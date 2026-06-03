import { Folder } from "lucide-react"

import { formatCompactNumber } from "@/components/V2/Agents/formatters"
import type { Profile } from "@/components/V2/Profiles/peopleData"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: string
  /** Lead metric is tinted purple. */
  lead?: boolean
}

function ProfileStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="mt-auto grid grid-cols-3 border-t border-border/60">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "py-[11px]",
            index > 0 && "border-l border-border/60 pl-3",
          )}
        >
          <div
            className={cn(
              "font-mono text-[15px] font-semibold tabular-nums tracking-[-0.01em]",
              stat.lead ? "text-[#8447ff]" : "text-foreground",
            )}
          >
            {stat.value}
          </div>
          <div className="mt-[3px] font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground/70">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileCard({ profile }: { profile: Profile }) {
  const you = profile.isCurrentUser
  const stats: Stat[] = [
    { label: "Reuses", value: profile.reuses.toLocaleString(), lead: true },
    { label: "Docs", value: profile.docs.toLocaleString() },
    { label: "Saved", value: formatCompactNumber(profile.tokensSaved) },
  ]

  return (
    <article
      className={cn(
        "relative flex min-h-[168px] flex-col border border-border bg-card px-4 pt-[15px]",
        you && "border-t-2 border-t-[#8447ff]",
      )}
    >
      {you && (
        <span className="absolute right-3.5 top-3 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8447ff]">
          You
        </span>
      )}

      <div className="flex items-center gap-[11px]">
        <div
          className={cn(
            "grid size-[38px] shrink-0 place-items-center font-mono text-[13px] font-semibold outline outline-1",
            you
              ? "bg-[#8447ff] text-white outline-[#8447ff]"
              : "bg-muted text-foreground outline-border",
          )}
        >
          {profile.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-[-0.01em]">
            {profile.name}
          </div>
          <div className="mt-[3px] font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
            {profile.role}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-[1.45] text-muted-foreground">
        {profile.focus}
      </p>

      <ProfileStats stats={stats} />

      <div className="-mx-4 flex items-center justify-between gap-2 border-t border-border/60 px-4 py-[9px] font-mono text-[9.5px] tracking-[0.03em] text-muted-foreground/70">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "size-1.5 shrink-0",
              profile.active
                ? "bg-emerald-600 dark:bg-emerald-400"
                : "bg-border",
            )}
          />
          {profile.lastActive}
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
          <Folder
            className="size-[11px] text-muted-foreground/70"
            aria-hidden
          />
          {profile.topFolder}
        </div>
      </div>
    </article>
  )
}
