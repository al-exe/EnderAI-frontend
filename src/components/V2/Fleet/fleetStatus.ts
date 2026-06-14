import type {
  TaskforceFleetAgent,
  TaskforceFleetSession,
} from "@/api/v2Taskforce"

/**
 * Calm-roster status model from the Claude Design "Fleet Mission Control"
 * handoff. The design surfaces four states; today the backend only lets us
 * distinguish `run` vs `idle` from `minutes_ago`, so `waiting`/`paused` are
 * typed-but-degraded until TF-245 (backend enrichment) lands an explicit
 * status/capture field on the agent payload.
 */
export type FleetStatus = "run" | "waiting" | "paused" | "idle"

/** Minutes within which an agent counts as actively running. */
const RUNNING_WINDOW_MINUTES = 5

/** Quiet word shown next to a non-running status dot. */
export const STATE_LABEL: Record<FleetStatus, string> = {
  run: "running",
  waiting: "waiting for input",
  paused: "capture paused",
  idle: "idle",
}

// Optional richer fields the backend does not expose yet (TF-245). Read
// defensively so the UI lights up automatically once the contract grows.
type EnrichedAgent = TaskforceFleetAgent & {
  status?: FleetStatus
  question?: string | null
  capture?: "on" | "paused"
  pause_reason?: string | null
  host?: string | null
  started_at?: string | null
  files?: { name: string; state: "new" | "modified" }[]
  specialist_name?: string | null
  specialist_rule_count?: number | null
}

export function agentStatus(agent: TaskforceFleetAgent): FleetStatus {
  const explicit = (agent as EnrichedAgent).status
  if (explicit) return explicit
  return agent.minutes_ago < RUNNING_WINDOW_MINUTES ? "run" : "idle"
}

export function isRunning(agent: TaskforceFleetAgent): boolean {
  return agentStatus(agent) === "run"
}

/** Backend-enrichment accessors — return undefined/null while degraded. */
export function agentQuestion(agent: TaskforceFleetAgent): string | null {
  return (agent as EnrichedAgent).question ?? null
}

export function agentCapturePaused(agent: TaskforceFleetAgent): boolean {
  return (agent as EnrichedAgent).capture === "paused"
}

export function agentPauseReason(agent: TaskforceFleetAgent): string | null {
  return (agent as EnrichedAgent).pause_reason ?? null
}

export function agentStartedAt(agent: TaskforceFleetAgent): string | null {
  return (agent as EnrichedAgent).started_at ?? null
}

export function agentFiles(
  agent: TaskforceFleetAgent,
): { name: string; state: "new" | "modified" }[] {
  return (agent as EnrichedAgent).files ?? []
}

export function agentSpecialistName(agent: TaskforceFleetAgent): string | null {
  return (agent as EnrichedAgent).specialist_name ?? null
}

export function agentSpecialistRuleCount(
  agent: TaskforceFleetAgent,
): number | null {
  return (agent as EnrichedAgent).specialist_rule_count ?? null
}

// Turn a raw harness model id into a human label, e.g.
// "claude-opus-4-8" -> "Opus 4.8", "claude-fable-5" -> "Fable 5".
export function modelLabel(modelId: string | null): string | null {
  if (!modelId) return null
  const [family, ...rest] = modelId.replace(/^claude-/, "").split("-")
  if (!family) return null
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  const version = rest.join(".")
  return version ? `${name} ${version}` : name
}

export function repoLabel(agent: TaskforceFleetAgent): string {
  const cwdParts = agent.cwd?.split("/").filter(Boolean) ?? []
  return agent.repo || cwdParts[cwdParts.length - 1] || "Unknown repo"
}

/** Machine label, e.g. "mbp-16". Degrades to null until TF-245. */
export function hostLabel(agent: TaskforceFleetAgent): string | null {
  return (agent as EnrichedAgent).host ?? null
}

// Heading shown for an agent. Once Taskforce has captured a document the
// document title wins; until then a brand-new session shows the model it's
// running (e.g. "Opus 4.8") rather than the bare working-directory name.
export function agentDisplayName(agent: TaskforceFleetAgent): string {
  return agent.title || modelLabel(agent.model_id) || repoLabel(agent)
}

export function agentModelName(agent: TaskforceFleetAgent): string {
  return modelLabel(agent.model_id) || "Connected agent"
}

/** Mono identity meta — "Opus 4.8 · mbp-16", host omitted while degraded. */
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

export function presenceLabel(agent: TaskforceFleetAgent): string {
  if (agent.minutes_ago < 1) return "Active now"
  if (agent.minutes_ago === 1) return "Active 1 minute ago"
  return `Active ${agent.minutes_ago} minutes ago`
}

/** Display name for a fleet (server may create nameless fleets). */
export function fleetTitle(fleet: TaskforceFleetSession): string {
  return fleet.name?.trim() || "Untitled fleet"
}

/** Repo/branch shown on a fleet card header, derived from its agents. */
export function fleetRepo(
  fleet: TaskforceFleetSession,
): { repo: string; branch: string | null } | null {
  for (const agent of fleet.agents) {
    if (agent.repo) {
      return { repo: agent.repo, branch: agent.branch }
    }
  }
  return null
}

export function runningCount(agents: TaskforceFleetAgent[]): number {
  return agents.filter(isRunning).length
}

export function waitingCount(agents: TaskforceFleetAgent[]): number {
  return agents.filter((agent) => agentStatus(agent) === "waiting").length
}
