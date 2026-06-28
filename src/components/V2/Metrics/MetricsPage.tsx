import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ReceiptText } from "lucide-react"
import { useMemo, useState } from "react"
import {
  type MetricDefinitionPublic,
  type MetricsScope,
  type MetricsWindow,
  type MetricValuePublic,
  readMetricDefinitions,
  readMetrics,
} from "@/api/v2Metrics"
import {
  readTaskforceSessionLog,
  readTaskforceSessionSavings,
  type TaskforceSessionLogEntry,
  type TaskforceSessionSavingsResponse,
} from "@/api/v2Taskforce"
import type { UserPublic } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScopeFilterBar } from "@/components/V2/ScopeFilterBar"
import {
  V2_PAGE_BODY,
  V2_PAGE_FRAME,
  V2_TAB_CONTENT_CLASS,
  V2_TAB_EYEBROW_CLASS,
  V2_TAB_HEADER_STACK_CLASS,
} from "@/components/V2/v2PageShell"
import { usePersistentState } from "@/hooks/usePersistentState"
import { cn } from "@/lib/utils"
import { formatMetricValue } from "./formatters"
import { MethodologyLink } from "./MethodologyLink"
import { MetricBreakdown } from "./MetricBreakdown"
import { MetricCard } from "./MetricCard"
import { MetricsScopeToggle } from "./MetricsScopeToggle"
import { MetricTrendChart } from "./MetricTrendChart"

const METRICS_WINDOWS: { key: MetricsWindow; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
]

type Props = {
  currentUser: UserPublic
  sessionId?: string
}

const PRIMARY_METRICS = ["tokens_saved", "usd_saved", "reuse_rate"]
const SECONDARY_METRICS = ["tokens_consumed"]
const CROSS_BOUNDARY_RATE_METRIC = "cross_boundary_reuse_rate"
const CROSS_BOUNDARY_SAVINGS_METRIC = "cross_boundary_tokens_saved"

const SAVINGS_V2_DETAIL_METRICS = [
  "avoided_rediscovery",
  "avoided_rediscovery_usd",
  "documents_consulted",
] as const

type DetailMetricEntry =
  | { kind: "usd_net_saved" }
  | { kind: "metric"; name: string }

function detailMetricEntries(savingsV2Flag: boolean): DetailMetricEntry[] {
  const entries: DetailMetricEntry[] = [
    { kind: "usd_net_saved" },
    { kind: "metric", name: "usd_consumed" },
  ]
  if (savingsV2Flag) {
    for (const name of SAVINGS_V2_DETAIL_METRICS) {
      entries.push({ kind: "metric", name })
    }
  }
  entries.push({ kind: "metric", name: "documents_touched" })
  return entries
}
const SESSION_PRICING_MODEL_ID = "claude-opus-4-7"
const SESSION_PRIMARY_METRICS = [
  "tokens_saved",
  "usd_saved",
  "documents_consulted",
]

const METRIC_PRESENTATION_OVERRIDES: Record<
  string,
  Partial<Pick<MetricDefinitionPublic, "display_name" | "description">>
> = {
  tokens_saved: {
    description:
      "Estimated tokens not sent to model provided thanks to Taskforce's information rediscovery.",
  },
  usd_saved: {
    display_name: "USD Offset",
  },
  reuse_rate: {
    description:
      "How often Taskforce found useful existing work instead of starting from scratch.",
  },
  tokens_consumed: {
    description: "Total input and output tokens consumed by Taskforce.",
  },
  documents_touched: {
    description: "Documents Taskforce created, reused, updated, or finished.",
  },
}

const USD_NET_SAVED_DEFINITION: MetricDefinitionPublic = {
  name: "usd_net_saved",
  display_name: "USD Saved",
  unit: "usd",
  description: "USD offset minus USD spent.",
  presentation: {
    format: "usd",
    trend: false,
    icon: null,
  },
}

const SESSION_METRIC_DEFINITIONS: Record<string, MetricDefinitionPublic> = {
  tokens_saved: {
    name: "tokens_saved",
    display_name: "Tokens Saved",
    unit: "tokens",
    description: "Net tokens saved by this Taskforce session.",
    presentation: {
      format: "compact-int",
      trend: false,
      icon: null,
    },
  },
  usd_saved: {
    name: "usd_saved",
    display_name: "USD Saved",
    unit: "usd",
    description: `Approximate USD saved using ${SESSION_PRICING_MODEL_ID} pricing.`,
    presentation: {
      format: "usd",
      trend: false,
      icon: null,
    },
  },
  documents_consulted: {
    name: "documents_consulted",
    display_name: "Documents Consulted",
    unit: "count",
    description: "Documents Taskforce consulted for this session.",
    presentation: {
      format: "count",
      trend: false,
      icon: null,
    },
  },
}

const WINDOW_COPY: Record<MetricsWindow, { label: string; title: string }> = {
  "7d": { label: "7d", title: "this week" },
  "30d": { label: "30d", title: "in the last 30 days" },
  all: { label: "all", title: "all time" },
}

function metricsEyebrowLabel(
  window: MetricsWindow,
  scope: MetricsScope,
  sessionShortId?: string,
) {
  if (sessionShortId) {
    return `session · ${sessionShortId}`
  }
  return `${WINDOW_COPY[window].label} · ${scope}`
}

function toMetricNumber(value: string | number | null | undefined) {
  if (value == null) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function metricValue(total: string | number): MetricValuePublic {
  return {
    total: String(total),
    delta_vs_prev_window: null,
    series: [],
    breakdown_by_source: null,
    top_models: null,
  }
}

function buildFallbackSessionSavings(
  sessionId: string,
  entries: TaskforceSessionLogEntry[],
): TaskforceSessionSavingsResponse {
  const occurredAtValues = entries
    .map((entry) => entry.occurred_at)
    .filter(Boolean)
    .sort()
  const documentIds = new Set(entries.map((entry) => entry.document_id))
  return {
    session_id: sessionId,
    doc_count: documentIds.size,
    net_saved_tokens: entries.reduce(
      (total, entry) => total + entry.net_saved_tokens,
      0,
    ),
    usd_saved: "0",
    pricing_model_id: SESSION_PRICING_MODEL_ID,
    occurred_at_first: occurredAtValues[0] ?? null,
    occurred_at_last: occurredAtValues[occurredAtValues.length - 1] ?? null,
    specialist_slug: null,
    specialist_name: null,
  }
}

function formatSessionDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsed)
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "0%"
  return `${Math.round(score * 100)}%`
}

function CrossBoundaryReusePanel({
  rateDefinition,
  rateValue,
  savingsDefinition,
  savingsValue,
}: {
  rateDefinition: MetricDefinitionPublic | undefined
  rateValue: MetricValuePublic | undefined
  savingsDefinition: MetricDefinitionPublic | undefined
  savingsValue: MetricValuePublic | undefined
}) {
  const rows = savingsValue?.breakdown_by_source ?? []
  const totalTokens = rows.reduce((sum, row) => sum + row.tokens, 0)
  const rateLabel = formatMetricValue(rateValue?.total, "ratio")
  const savedLabel = formatMetricValue(savingsValue?.total, "compact-int")

  return (
    <Link
      to="/v2/ledger"
      search={{ cross_boundary: true }}
      data-testid="cross-boundary-metric"
      className={cn(
        "group block rounded-lg border border-border bg-background p-4 text-foreground shadow-sm transition-colors hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            {rateDefinition?.display_name ?? "Boundary-Crossing Reuse"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {savingsDefinition?.description ??
              "Tokens saved when work crossed a person or tool boundary."}
          </p>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground group-hover:text-foreground">
          <ReceiptText className="size-4" />
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{rateLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            of document consultations
          </div>
        </div>
        <div>
          <div className="text-3xl font-semibold tabular-nums">
            {savedLabel}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {savingsDefinition?.display_name ?? "Boundary savings"}
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 space-y-2">
          {rows.map((row) => {
            const share = totalTokens > 0 ? row.tokens / totalTokens : 0
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="tabular-nums">
                    {formatMetricValue(row.tokens, "compact-int")}
                  </span>
                </div>
                <div className="h-1 bg-muted">
                  <div
                    className="h-1 bg-primary"
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No cross-boundary reuse yet.
        </p>
      )}
    </Link>
  )
}

export function MetricsPage({ currentUser, sessionId }: Props) {
  const { isDemoMode } = useDemoMode()
  const [window, setWindow] = useState<MetricsWindow>("7d")
  const [scope, setScope] = useState<MetricsScope>("personal")
  const scopedSessionId = sessionId?.trim() || undefined
  const sessionShortId = scopedSessionId?.slice(0, 8)
  const canViewOrganizationMetrics =
    Boolean(currentUser.organization_id) &&
    currentUser.organization_role === "admin"
  const effectiveScope = scopedSessionId ? "personal" : scope
  // TF-177 / Phase 3 feature flag. When enabled, surface the
  // Avoided Rediscovery card driven by document.consulted events.
  // Toggle by setting `localStorage["taskforce.flags.savings_v2"] = "true"`
  // until a real settings UI lands.
  const [savingsV2Flag] = usePersistentState<boolean>("flags.savings_v2", false)

  const definitionsQuery = useQuery({
    queryKey: ["v2-metrics-definitions"],
    queryFn: () => readMetricDefinitions(),
    staleTime: 5 * 60 * 1000,
  })

  const metricsQuery = useQuery({
    queryKey: [
      "v2-metrics",
      { window, scope: effectiveScope, demo: isDemoMode },
    ],
    queryFn: () =>
      readMetrics({ window, scope: effectiveScope, demo: isDemoMode }),
    staleTime: 30 * 1000,
  })

  const sessionSavingsQuery = useQuery({
    queryKey: [
      "v2-taskforce-session-savings",
      { sessionId: scopedSessionId, pricingModelId: SESSION_PRICING_MODEL_ID },
    ],
    queryFn: () =>
      readTaskforceSessionSavings({
        sessionId: scopedSessionId ?? "",
        pricingModelId: SESSION_PRICING_MODEL_ID,
      }),
    enabled: Boolean(scopedSessionId),
    retry: false,
    staleTime: 30 * 1000,
  })

  const sessionLogQuery = useQuery({
    queryKey: ["v2-taskforce-session-log", { sessionId: scopedSessionId }],
    queryFn: () =>
      readTaskforceSessionLog({ sessionId: scopedSessionId ?? "", limit: 50 }),
    enabled: Boolean(scopedSessionId),
    staleTime: 30 * 1000,
  })

  const definitionsByName = useMemo(() => {
    const out: Record<string, MetricDefinitionPublic> = {}
    for (const d of definitionsQuery.data?.data ?? []) {
      out[d.name] = { ...d, ...METRIC_PRESENTATION_OVERRIDES[d.name] }
    }
    return out
  }, [definitionsQuery.data])

  const metrics = metricsQuery.data?.metrics ?? {}
  const sessionLogEntries = sessionLogQuery.data?.entries ?? []
  const fallbackSessionSavings =
    scopedSessionId && sessionLogQuery.isSuccess
      ? buildFallbackSessionSavings(scopedSessionId, sessionLogEntries)
      : null
  const sessionSavings = sessionSavingsQuery.data ?? fallbackSessionSavings
  const sessionMetricValues: Record<string, MetricValuePublic> = {
    tokens_saved: metricValue(sessionSavings?.net_saved_tokens ?? 0),
    usd_saved: metricValue(sessionSavings?.usd_saved ?? "0"),
    documents_consulted: metricValue(
      sessionSavings?.doc_count ?? sessionLogEntries.length,
    ),
  }
  const tokensSaved = metrics.tokens_saved
  const tokensConsumed = metrics.tokens_consumed
  const crossBoundaryRate = metrics[CROSS_BOUNDARY_RATE_METRIC]
  const crossBoundarySavings = metrics[CROSS_BOUNDARY_SAVINGS_METRIC]
  const usdOffset = toMetricNumber(metrics.usd_saved?.total)
  const usdSpent = toMetricNumber(metrics.usd_consumed?.total)
  const usdNetSaved: MetricValuePublic = {
    total: String(usdOffset - usdSpent),
    delta_vs_prev_window: null,
    series: [],
    breakdown_by_source: null,
    top_models: null,
  }
  const isEmpty =
    metricsQuery.isSuccess &&
    Object.values(metrics).every((m) => {
      const total = Number.parseFloat(m.total)
      return !Number.isFinite(total) || total === 0
    })

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div className={cn(V2_PAGE_BODY, "gap-0 pb-6 md:pb-8")}>
        <div className={V2_TAB_HEADER_STACK_CLASS}>
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className={V2_TAB_EYEBROW_CLASS}>
                {metricsEyebrowLabel(window, effectiveScope, sessionShortId)}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Metrics
              </h1>
            </div>
            {!scopedSessionId && canViewOrganizationMetrics && (
              <MetricsScopeToggle value={scope} onChange={setScope} />
            )}
          </header>
          <ScopeFilterBar
            items={METRICS_WINDOWS}
            active={window}
            onChange={setWindow}
          />
        </div>

        <div className={V2_TAB_CONTENT_CLASS}>
          {scopedSessionId && (
            <div
              data-testid="metrics-session-filter-banner"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100"
            >
              <span>
                Showing savings for session{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
                  {sessionShortId}
                </code>
              </span>
              <Link
                to="/v2/metrics"
                search={{}}
                className="font-medium underline-offset-4 hover:underline"
              >
                View all metrics →
              </Link>
            </div>
          )}

          {metricsQuery.isError && (
            <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm">
              Failed to load metrics. Try again in a moment.
            </div>
          )}

          {isEmpty && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No metrics yet. Connect your MCP and start using Taskforce —
              events show up here within a minute of the agent's first call.
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(scopedSessionId ? SESSION_PRIMARY_METRICS : PRIMARY_METRICS).map(
              (name) => {
                const def = scopedSessionId
                  ? SESSION_METRIC_DEFINITIONS[name]
                  : definitionsByName[name]
                const value = scopedSessionId
                  ? sessionMetricValues[name]
                  : metrics[name]
                if (!def) return null
                return <MetricCard key={name} definition={def} value={value} />
              },
            )}
          </section>

          {!scopedSessionId && (
            <CrossBoundaryReusePanel
              rateDefinition={definitionsByName[CROSS_BOUNDARY_RATE_METRIC]}
              rateValue={crossBoundaryRate}
              savingsDefinition={
                definitionsByName[CROSS_BOUNDARY_SAVINGS_METRIC]
              }
              savingsValue={crossBoundarySavings}
            />
          )}

          {scopedSessionId && (
            <SessionLogTable
              entries={sessionLogEntries}
              isError={sessionLogQuery.isError}
              isLoading={sessionLogQuery.isLoading}
            />
          )}

          <MethodologyLink />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MetricTrendChart
              title="Tokens saved per day"
              series={tokensSaved?.series ?? []}
            />
            <MetricBreakdown
              title="Savings by source"
              rows={tokensSaved?.breakdown_by_source ?? []}
              info="Shows where Taskforce avoided rework: cache reuse, reading summaries instead of full details, and reconnecting to existing documents."
            />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {detailMetricEntries(savingsV2Flag).map((entry) => {
              if (entry.kind === "usd_net_saved") {
                return (
                  <MetricCard
                    key="usd_net_saved"
                    definition={USD_NET_SAVED_DEFINITION}
                    value={usdNetSaved}
                  />
                )
              }
              const def = definitionsByName[entry.name]
              if (!def) return null
              return (
                <MetricCard
                  key={entry.name}
                  definition={def}
                  value={metrics[entry.name]}
                />
              )
            })}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SECONDARY_METRICS.map((name) => {
              const def = definitionsByName[name]
              if (!def) return null
              return (
                <MetricCard key={name} definition={def} value={metrics[name]} />
              )
            })}
          </section>

          <section>
            <MetricBreakdown
              title="Top models by tokens used"
              rows={tokensConsumed?.top_models ?? []}
            />
          </section>
        </div>
      </div>
    </section>
  )
}

function SessionLogTable({
  entries,
  isError,
  isLoading,
}: {
  entries: TaskforceSessionLogEntry[]
  isError: boolean
  isLoading: boolean
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Session Consult Log
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Documents Taskforce consulted while calculating this session's
            savings.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading session log…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load the session log.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No consulted documents were recorded for this session.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Band</TableHead>
              <TableHead className="text-right">Net Tokens</TableHead>
              <TableHead>Occurred</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={`${entry.query_id}-${entry.document_id}`}>
                <TableCell className="max-w-72 truncate font-medium">
                  {entry.title}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatScore(entry.score)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{entry.confidence_band}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.net_saved_tokens.toLocaleString()}
                </TableCell>
                <TableCell>{formatSessionDate(entry.occurred_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
