import type {
  TaskforceFleetAgent,
  TaskforceFleetSession,
} from "@/api/v2Taskforce"

/**
 * Calm-roster status model from the Claude Design "Fleet Mission Control"
 * handoff. The API spells the active state `running`; this presentation model
 * keeps the shorter `run` key used by the CSS module.
 */
export type FleetStatus = "run" | "waiting" | "paused" | "idle"

/** Quiet word shown next to a non-running status dot. */
export const STATE_LABEL: Record<FleetStatus, string> = {
  run: "running",
  waiting: "awaiting prompt",
  paused: "capture paused",
  idle: "idle",
}

/** One-line roster status in the agent row's second column. */
export const ROSTER_STATUS_LABEL: Record<FleetStatus, string> = {
  run: "Agent responding",
  waiting: "Agent waiting",
  paused: "Capture paused",
  idle: "Agent idle",
}

export function rosterStatusLabel(agent: TaskforceFleetAgent): string {
  return ROSTER_STATUS_LABEL[agentStatus(agent)]
}

/** Which coding tool drives a session — backend-classified for the row chip. */
export type AgentKind = "claude" | "codex" | "cursor" | "other"

/** Short chip label per tool. "Other" covers unknown/unreported clients. */
export const AGENT_KIND_LABEL: Record<AgentKind, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  other: "Other",
}

/** Defensive against APIs that predate `agent_kind`. */
export function agentKind(agent: TaskforceFleetAgent): AgentKind {
  const kind = agent.agent_kind
  return kind === "claude" || kind === "codex" || kind === "cursor"
    ? kind
    : "other"
}

// Ingestion does not capture these fields yet. Keep the accessors defensive so
// the detail route can adopt them without fabricating data in the API.
type FutureAgentFields = TaskforceFleetAgent & {
  question?: string | null
  capture?: "on" | "paused"
  pause_reason?: string | null
  host?: string | null
  files?: { name: string; state: "new" | "modified" }[]
  specialist_name?: string | null
}

export function agentStatus(agent: TaskforceFleetAgent): FleetStatus {
  return agent.status === "running" ? "run" : agent.status
}

export function isRunning(agent: TaskforceFleetAgent): boolean {
  return agentStatus(agent) === "run"
}

/** Future enrichment accessors return empty values while ingestion is absent. */
export function agentQuestion(agent: TaskforceFleetAgent): string | null {
  return (agent as FutureAgentFields).question ?? null
}

export function agentCapturePaused(agent: TaskforceFleetAgent): boolean {
  return (agent as FutureAgentFields).capture === "paused"
}

export function agentPauseReason(agent: TaskforceFleetAgent): string | null {
  return (agent as FutureAgentFields).pause_reason ?? null
}

export function agentStartedAt(agent: TaskforceFleetAgent): string | null {
  return agent.started_at
}

export function agentFiles(
  agent: TaskforceFleetAgent,
): { name: string; state: "new" | "modified" }[] {
  return (agent as FutureAgentFields).files ?? []
}

export function agentSpecialistName(agent: TaskforceFleetAgent): string | null {
  return (agent as FutureAgentFields).specialist_name ?? null
}

export function agentSpecialistRuleCount(
  agent: TaskforceFleetAgent,
): number | null {
  return agent.specialist_rule_count
}

// Turn a raw harness model id into a human label, e.g.
// "claude-opus-4-8" -> "Opus 4.8", "claude-fable-5" -> "Fable 5".
export function modelLabel(modelId: string | null): string | null {
  if (!modelId) return null
  const [family, ...rest] = modelId.replace(/^claude-/, "").split("-")
  if (!family) return null
  const name =
    family.toLowerCase() === "gpt"
      ? "GPT"
      : family.charAt(0).toUpperCase() + family.slice(1)
  const version = rest.join(".")
  return version ? `${name} ${version}` : name
}

/** Fallback label when display_name is unset. Uses cwd basename only. */
export function repoLabel(agent: TaskforceFleetAgent): string {
  const cwdParts = agent.cwd?.split("/").filter(Boolean) ?? []
  return cwdParts[cwdParts.length - 1] || "Unknown repo"
}

/** Machine label, e.g. "mbp-16". Not captured by ingestion yet. */
export function hostLabel(agent: TaskforceFleetAgent): string | null {
  return (agent as FutureAgentFields).host ?? null
}

// Heading shown for an agent session in Fleet. The backend captures a stable
// one-line summary at conversation start; users can rename it from the roster.
export function agentDisplayName(agent: TaskforceFleetAgent): string {
  return agent.display_name || modelLabel(agent.model_id) || repoLabel(agent)
}

export function agentModelName(agent: TaskforceFleetAgent): string {
  return modelLabel(agent.model_id) || "Connected agent"
}

/** Mono identity meta — "Opus 4.8 · mbp-16", host omitted when unavailable. */
export function agentMeta(agent: TaskforceFleetAgent): string {
  return [agentModelName(agent), hostLabel(agent)].filter(Boolean).join(" · ")
}

export function compactPresence(agent: TaskforceFleetAgent): string {
  if (agent.minutes_ago < 1) return "now"
  if (agent.minutes_ago < 60) return `${agent.minutes_ago}m`
  const hours = Math.floor(agent.minutes_ago / 60)
  const minutes = agent.minutes_ago % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

/** Clock time (HH:MM) for an activity event timestamp. */
export function formatClockTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const FLEET_UI_MARKERS = [
  "View in Ledger",
  "Awaiting user prompt",
  "Running in this terminal",
]

/** Strip Cursor wrappers and Fleet UI paste noise for activity display. */
export function cleanActivityPromptText(text: string | null | undefined): string {
  if (!text) return ""
  let cleaned = text
    .replace(/^<user_query>\s*/i, "")
    .replace(/\s*<\/user_query>\s*$/i, "")
    .trim()
  if (!FLEET_UI_MARKERS.some((marker) => cleaned.includes(marker))) {
    return cleaned
  }
  const blocks = cleaned
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  const tail = blocks[blocks.length - 1]
  if (
    tail &&
    tail.length <= 400 &&
    !FLEET_UI_MARKERS.some((marker) => tail.includes(marker))
  ) {
    return tail
  }
  return cleaned
}

/** Relative time for the live timeline head — matches the session header. */
export function liveActivityTime(agent: TaskforceFleetAgent): string {
  return compactPresence(agent)
}

type LiveActivityOptions = {
  capturePaused?: boolean
  pauseReason?: string | null
}

/** Status-aware copy for the live timeline head. */
export function liveActivityLabel(
  agent: TaskforceFleetAgent,
  options: LiveActivityOptions = {},
): string {
  const status = agentStatus(agent)
  const summary = agent.summary_markdown?.trim()

  if (status === "run") {
    return summary || "Running in this terminal"
  }
  if (status === "waiting") {
    return "Awaiting user prompt"
  }
  if (status === "paused" || options.capturePaused) {
    const reason = options.pauseReason?.trim()
    return reason
      ? `Activity capture paused — ${reason}`
      : "Activity capture is paused"
  }
  return "Connected but not actively running"
}

/** Compact single-line activity for the roster row sub-line. Only shows captured
   work summary — status copy lives in the row's status column. */
export function agentActivityLine(agent: TaskforceFleetAgent): string {
  const summary = agent.summary_markdown?.trim()
  if (!summary) return ""
  const firstLine = summary.split(/\r?\n/)[0]?.trim() ?? ""
  return firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine
}

/** Session detail "Working on" body when no summary is stored yet. */
export function sessionWorkSummary(agent: TaskforceFleetAgent): string {
  const summary = agent.summary_markdown?.trim()
  if (summary) return summary

  const status = agentStatus(agent)
  if (status === "run") {
    return "Running in this terminal. A summary appears after Taskforce capture records work."
  }
  if (status === "paused" || agentCapturePaused(agent)) {
    return "Activity capture is paused, so no summary is being updated."
  }
  return "No summary has been captured for this session yet."
}

/** Locale-aware date and time in the browser's local timezone. */
export function formatLocalDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function presenceLabel(agent: TaskforceFleetAgent): string {
  if (agent.minutes_ago < 1) return "Active now"
  if (agent.minutes_ago === 1) return "Active 1 minute ago"
  return `Active ${agent.minutes_ago} minutes ago`
}

/** Display name for a fleet (server may create nameless fleets). */
export function fleetTitle(fleet: TaskforceFleetSession): string {
  return fleet.name?.trim() || "Untitled group"
}

export function runningCount(agents: TaskforceFleetAgent[]): number {
  return agents.filter(isRunning).length
}

export function waitingCount(agents: TaskforceFleetAgent[]): number {
  return agents.filter((agent) => agentStatus(agent) === "waiting").length
}
