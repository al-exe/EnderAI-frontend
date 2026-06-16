import {
  V2_TEXT_BASE_CLASS,
  V2_TEXT_SM_CLASS,
  V2_TEXT_XS_CLASS,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"

/** Page title — matches Library / Metrics v2 tabs. */
export const AGENT_PAGE_TITLE_CLASS = "text-2xl font-semibold"

/** List row specialist name. */
export const AGENT_NAME_CLASS = cn(
  V2_TEXT_BASE_CLASS,
  "font-semibold leading-5 text-foreground",
)

/** List row role line. */
export const AGENT_ROLE_CLASS = cn(
  V2_TEXT_SM_CLASS,
  "leading-4 text-muted-foreground",
)

/** Detail page specialist name (same scale as other v2 tab titles). */
export const AGENT_DETAIL_NAME_CLASS = AGENT_PAGE_TITLE_CLASS

/** Page eyebrow — matches Metrics tab meta line. */
export const AGENT_EYEBROW_CLASS = V2_TAB_EYEBROW_CLASS

/** Detail breadcrumb — same mono eyebrow as Agents list meta line. */
export const AGENT_BREADCRUMB_CLASS = V2_TAB_EYEBROW_CLASS

/** Role · playbook line — left-aligned with avatar and breadcrumb. */
export const AGENT_DETAIL_SUBTITLE_CLASS = cn(
  "mt-1 leading-5 text-muted-foreground",
  V2_TEXT_SM_CLASS,
)

export const AGENT_DETAIL_AVATAR_CLASS =
  "grid size-5 shrink-0 place-items-center border border-background bg-[#8447ff] font-mono text-[0.667rem] font-semibold text-white outline outline-1 outline-border"

export const AGENT_ROUTE_LABEL_CLASS = cn(
  V2_TEXT_SM_CLASS,
  "text-muted-foreground",
)

export const AGENT_ROUTE_CHIP_CLASS = cn(
  "border border-border px-1.5 py-0.5 text-muted-foreground",
  V2_TEXT_XS_CLASS,
)

export const AGENT_DESCRIPTION_CLASS = cn(
  V2_TEXT_SM_CLASS,
  "leading-5 text-muted-foreground",
)

export const AGENT_STAT_LABEL_CLASS = cn(
  V2_TEXT_XS_CLASS,
  "tracking-[0.01em] text-muted-foreground",
)

export const AGENT_STAT_VALUE_CLASS = cn(
  V2_TEXT_SM_CLASS,
  "font-semibold tabular-nums text-foreground",
)

export const AGENT_SECTION_TITLE_CLASS = cn(
  V2_TEXT_SM_CLASS,
  "font-semibold text-foreground",
)

export const AGENT_SECTION_META_CLASS = cn(
  V2_TEXT_XS_CLASS,
  "text-muted-foreground",
)

export const AGENT_TABLE_HEADER_CLASS = cn(
  V2_TEXT_XS_CLASS,
  "tracking-[0.01em] text-muted-foreground",
)

export const AGENT_FEATURE_STRIP_VALUE_CLASS =
  "text-2xl font-semibold tabular-nums text-foreground"
