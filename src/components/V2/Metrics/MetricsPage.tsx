import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ReceiptText } from "lucide-react"
import { useMemo, useState } from "react"
import {
  type MetricDefinitionPublic,
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
import { useExperimentalMode } from "@/components/experimental-mode-provider"
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
  V2_PAGE_CONTENT,
  V2_PAGE_FRAME,
  V2_TAB_EYEBROW_CLASS,
} from "@/components/V2/v2PageShell"
import { usePersistentState } from "@/hooks/usePersistentState"
import { cn } from "@/lib/utils"
import { formatDelta, formatMetricValue } from "./formatters"
import { MethodologyLink } from "./MethodologyLink"
import { MetricBreakdown } from "./MetricBreakdown"
import { MetricCard } from "./MetricCard"
import { MetricsTimeRange } from "./MetricsTimeRange"
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

function formatPreciseSessionUsd(value: string | number | null | undefined) {
  const numeric = toMetricNumber(value)
  if (numeric !== 0 && Math.abs(numeric) < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 5,
    }).format(numeric)
  }
  return formatMetricValue(value, "usd")
}

function CrossBoundaryReusePanel({
  rateDefinition,
  rateValue,
  savingsDefinition,
  savingsValue,
  experimental = false,
}: {
  rateDefinition: MetricDefinitionPublic | undefined
  rateValue: MetricValuePublic | undefined
  savingsDefinition: MetricDefinitionPublic | undefined
  savingsValue: MetricValuePublic | undefined
  experimental?: boolean
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
        "group block border border-border bg-background p-4 text-foreground transition-colors hover:bg-muted/40",
        experimental ? "" : "rounded-lg shadow-sm",
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

// Org-scope toggle is intentionally deferred. The backend supports
// scope=organization on /v2/metrics (admin-gated), but the generated
// OpenAPI client doesn't yet expose organization_id / organization_role
// on UserPublic in this repo. When the client is regenerated, restore
// the MetricsScopeToggle import and the `scope` state below.
export function MetricsPage({ currentUser: _currentUser, sessionId }: Props) {
  const { isDemoMode } = useDemoMode()
  const { isExperimentalMode } = useExperimentalMode()
  const [window, setWindow] = useState<MetricsWindow>("7d")
  const scopedSessionId = sessionId?.trim() || undefined
  const sessionShortId = scopedSessionId?.slice(0, 8)
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
    queryKey: ["v2-metrics", { window, demo: isDemoMode }],
    queryFn: () => readMetrics({ window, scope: "personal", demo: isDemoMode }),
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

  if (isExperimentalMode) {
    return (
      <ExperimentalMetricsPage
        definitionsByName={definitionsByName}
        isEmpty={isEmpty}
        metrics={metrics}
        metricsQueryIsError={metricsQuery.isError}
        savingsV2Flag={savingsV2Flag}
        scopedSessionId={scopedSessionId}
        sessionLogEntries={sessionLogEntries}
        sessionLogIsError={sessionLogQuery.isError}
        sessionLogIsLoading={sessionLogQuery.isLoading}
        sessionMetricValues={sessionMetricValues}
        sessionSavings={sessionSavings}
        sessionShortId={sessionShortId}
        tokensConsumed={tokensConsumed}
        tokensSaved={tokensSaved}
        usdNetSaved={usdNetSaved}
        window={window}
        onWindowChange={setWindow}
      />
    )
  }

  return (
    <section className={V2_PAGE_FRAME}>
      <div className={V2_PAGE_CONTENT}>
        <div>
          <h1 className="text-2xl font-semibold">Metrics</h1>
        </div>
        <ScopeFilterBar
          items={METRICS_WINDOWS}
          active={window}
          onChange={setWindow}
        />

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
            No metrics yet. Connect your MCP and start using Taskforce — events
            show up here within a minute of the agent's first call.
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
            savingsDefinition={definitionsByName[CROSS_BOUNDARY_SAVINGS_METRIC]}
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
    </section>
  )
}

type ExperimentalMetricsPageProps = {
  definitionsByName: Record<string, MetricDefinitionPublic>
  isEmpty: boolean
  metrics: Record<string, MetricValuePublic>
  metricsQueryIsError: boolean
  savingsV2Flag: boolean
  scopedSessionId: string | undefined
  sessionLogEntries: TaskforceSessionLogEntry[]
  sessionLogIsError: boolean
  sessionLogIsLoading: boolean
  sessionMetricValues: Record<string, MetricValuePublic>
  sessionSavings: TaskforceSessionSavingsResponse | null
  sessionShortId: string | undefined
  tokensConsumed: MetricValuePublic | undefined
  tokensSaved: MetricValuePublic | undefined
  usdNetSaved: MetricValuePublic
  window: MetricsWindow
  onWindowChange: (window: MetricsWindow) => void
}

function ExperimentalMetricsPage({
  definitionsByName,
  isEmpty,
  metrics,
  metricsQueryIsError,
  savingsV2Flag,
  scopedSessionId,
  sessionLogEntries,
  sessionLogIsError,
  sessionLogIsLoading,
  sessionMetricValues,
  sessionSavings,
  sessionShortId,
  tokensConsumed,
  tokensSaved,
  usdNetSaved,
  window,
  onWindowChange,
}: ExperimentalMetricsPageProps) {
  if (scopedSessionId) {
    return (
      <ExperimentalSessionMetrics
        entries={sessionLogEntries}
        isError={sessionLogIsError}
        isLoading={sessionLogIsLoading}
        scopedSessionId={scopedSessionId}
        sessionMetricValues={sessionMetricValues}
        sessionSavings={sessionSavings}
        sessionShortId={sessionShortId}
      />
    )
  }

  const savedTokens = tokensSaved?.total ?? 0
  const savedUsd = metrics.usd_saved?.total ?? 0
  const consumedTokens = tokensConsumed?.total ?? 0
  const reuseRate = metrics.reuse_rate?.total ?? 0
  const crossBoundaryRate = metrics[CROSS_BOUNDARY_RATE_METRIC]
  const crossBoundarySavings = metrics[CROSS_BOUNDARY_SAVINGS_METRIC]
  const savingsRatio =
    toMetricNumber(consumedTokens) > 0
      ? toMetricNumber(savedTokens) / toMetricNumber(consumedTokens)
      : 0
  const documentsTouched = metrics.documents_touched
  const windowCopy = WINDOW_COPY[window]

  return (
    <div
      data-testid="metrics-experimental-page"
      className={`${V2_PAGE_CONTENT} bg-background font-sans text-foreground`}
    >
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className={V2_TAB_EYEBROW_CLASS}>
            Metrics · {windowCopy.label} · personal
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-none tracking-tight md:text-4xl">
            You saved{" "}
            <span className="text-primary">
              {formatMetricValue(savedTokens, "compact-int")} tokens
            </span>{" "}
            {windowCopy.title}.
          </h1>
        </div>
        <MetricsTimeRange value={window} onChange={onWindowChange} />
      </header>

      {metricsQueryIsError && (
        <div className="border border-destructive bg-destructive/10 p-3 text-sm">
          Failed to load metrics. Try again in a moment.
        </div>
      )}

      {isEmpty && (
        <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">
          No metrics yet. Connect your MCP and start using Taskforce. Events
          show up here within a minute of the agent's first call.
        </div>
      )}

      <section className="border border-border bg-background text-foreground">
        <div className="px-5 py-6 md:px-7">
          <div className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">
            Tokens saved · {windowCopy.label}
          </div>
          <div className="mt-3 text-6xl font-semibold leading-[0.9] tracking-tight tabular-nums md:text-7xl">
            {formatMetricValue(savedTokens, "compact-int")}
          </div>
          <div className="mt-4 font-mono text-xs tracking-wide text-emerald-300">
            {formatHeroDelta(tokensSaved, "compact-int")}
          </div>
          <div className="mt-2 text-sm opacity-70">
            {formatMetricValue(savedUsd, "usd")} offset ·{" "}
            {formatMetricValue(usdNetSaved.total, "usd")} net saved
          </div>
        </div>
        <div className="grid border-t border-border sm:grid-cols-2">
          <ExperimentalRatioCell
            label="Reuse rate"
            value={formatMetricValue(reuseRate, "ratio")}
          />
          <ExperimentalRatioCell
            label="Saved / used"
            value={`${formatRatioValue(savingsRatio)}x`}
            className="border-t border-border sm:border-t-0 sm:border-l"
          />
        </div>
      </section>

      <section className="grid border border-border md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="border-b border-border bg-muted/40 p-4 md:border-r md:border-b-0">
          <div className="text-sm font-semibold text-primary">Insights</div>
        </div>
        <p className="w-full p-4 text-sm leading-6 text-justify text-foreground">
          Taskforce avoided{" "}
          <b>{formatMetricValue(savedTokens, "compact-int")} tokens</b> and
          offset <b>{formatMetricValue(savedUsd, "usd")}</b> while using{" "}
          <b>{formatMetricValue(consumedTokens, "compact-int")} tokens</b>. The
          current reuse rate is{" "}
          <span className="font-mono text-primary">
            {formatMetricValue(reuseRate, "ratio")}
          </span>
          , with net savings of{" "}
          <b>{formatMetricValue(usdNetSaved.total, "usd")}</b> after model
          spend.
        </p>
      </section>

      <CrossBoundaryReusePanel
        experimental
        rateDefinition={definitionsByName[CROSS_BOUNDARY_RATE_METRIC]}
        rateValue={crossBoundaryRate}
        savingsDefinition={definitionsByName[CROSS_BOUNDARY_SAVINGS_METRIC]}
        savingsValue={crossBoundarySavings}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="min-w-0">
          <MetricTrendChart
            title="Tokens saved · daily"
            series={tokensSaved?.series ?? []}
          />
        </div>
        <ExperimentalBreakdownPanel
          title="Where savings came from"
          kicker="Savings by source"
          rows={tokensSaved?.breakdown_by_source ?? []}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {detailMetricEntries(savingsV2Flag).map((entry) => {
          if (entry.kind === "usd_net_saved") {
            return (
              <ExperimentalMetricTile
                key="usd_net_saved"
                definition={USD_NET_SAVED_DEFINITION}
                value={usdNetSaved}
              />
            )
          }
          const def = definitionsByName[entry.name]
          const value =
            entry.name === "documents_touched"
              ? documentsTouched
              : metrics[entry.name]
          if (!def) return null
          return (
            <ExperimentalMetricTile
              key={entry.name}
              definition={def}
              value={value}
            />
          )
        })}
      </section>

      <ExperimentalBreakdownPanel
        title="Top models by tokens used"
        kicker="Model usage"
        rows={tokensConsumed?.top_models ?? []}
      />

      <MethodologyLink />
    </div>
  )
}

function ExperimentalSessionMetrics({
  entries,
  isError,
  isLoading,
  scopedSessionId,
  sessionMetricValues,
  sessionSavings,
  sessionShortId,
}: {
  entries: TaskforceSessionLogEntry[]
  isError: boolean
  isLoading: boolean
  scopedSessionId: string
  sessionMetricValues: Record<string, MetricValuePublic>
  sessionSavings: TaskforceSessionSavingsResponse | null
  sessionShortId: string | undefined
}) {
  const tokensSaved = sessionMetricValues.tokens_saved
  const usdSaved = sessionMetricValues.usd_saved
  const documentsConsulted = sessionMetricValues.documents_consulted
  const firstSeen = sessionSavings?.occurred_at_first
  const lastSeen = sessionSavings?.occurred_at_last

  return (
    <div
      data-testid="metrics-experimental-session-page"
      className={`${V2_PAGE_CONTENT} bg-background font-sans text-foreground`}
    >
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className={V2_TAB_EYEBROW_CLASS}>
            Metrics · session · {sessionShortId}
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-none tracking-tight md:text-4xl">
            This session saved{" "}
            <span className="text-primary">
              {formatMetricValue(tokensSaved?.total, "compact-int")} tokens
            </span>
            .
          </h1>
          {sessionSavings?.specialist_slug ? (
            <Link
              to="/v2/agents/$slug"
              params={{ slug: sessionSavings.specialist_slug }}
              className="mt-3 inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-xs uppercase tracking-[0.12em] text-foreground hover:bg-muted"
            >
              Selected profile:{" "}
              <span className="font-semibold normal-case tracking-normal">
                {sessionSavings.specialist_name ??
                  sessionSavings.specialist_slug}
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
        <Link
          to="/v2/metrics"
          search={{}}
          className="border border-border px-3 py-2 text-sm font-medium text-foreground underline-offset-4 hover:bg-muted"
        >
          View all metrics →
        </Link>
      </header>

      <section className="grid border border-border bg-background text-foreground lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="px-5 py-6 md:px-7">
          <div className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">
            Session tokens saved
          </div>
          <div className="mt-3 text-6xl font-semibold leading-[0.9] tracking-tight tabular-nums md:text-7xl">
            {formatMetricValue(tokensSaved?.total, "compact-int")}
          </div>
          <div className="mt-4 text-sm opacity-70">
            {formatPreciseSessionUsd(usdSaved?.total)} estimated savings ·{" "}
            {formatMetricValue(documentsConsulted?.total, "count")} documents
            consulted
          </div>
        </div>
        <div className="grid border-t border-border sm:grid-cols-2 lg:border-t-0 lg:border-l">
          <ExperimentalRatioCell
            label="Documents"
            value={formatMetricValue(documentsConsulted?.total, "count")}
          />
          <ExperimentalRatioCell
            label="Pricing model"
            value={sessionSavings?.pricing_model_id ?? SESSION_PRICING_MODEL_ID}
            className="border-t border-border sm:border-t-0 sm:border-l lg:border-l-0 xl:border-l"
          />
          <ExperimentalRatioCell
            label="First event"
            value={firstSeen ? formatSessionDate(firstSeen) : "No event"}
            className="border-t border-border"
          />
          <ExperimentalRatioCell
            label="Last event"
            value={lastSeen ? formatSessionDate(lastSeen) : "No event"}
            className="border-t border-border sm:border-l"
          />
        </div>
      </section>

      <section className="grid border border-border md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="border-b border-border bg-muted/40 p-4 md:border-r md:border-b-0">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Session insights
          </div>
        </div>
        <p className="max-w-4xl p-4 text-sm leading-6 text-foreground">
          Session{" "}
          <code className="bg-muted px-1.5 py-0.5 font-mono text-xs">
            {scopedSessionId}
          </code>{" "}
          consulted{" "}
          <b>{formatMetricValue(documentsConsulted?.total, "count")}</b>{" "}
          documents and avoided{" "}
          <b>{formatMetricValue(tokensSaved?.total, "compact-int")} tokens</b>,
          worth about <b>{formatPreciseSessionUsd(usdSaved?.total)}</b> under{" "}
          {sessionSavings?.pricing_model_id ?? SESSION_PRICING_MODEL_ID}{" "}
          pricing.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {SESSION_PRIMARY_METRICS.map((name) => (
          <ExperimentalMetricTile
            key={name}
            definition={SESSION_METRIC_DEFINITIONS[name]}
            value={sessionMetricValues[name]}
            valueFormatter={
              name === "usd_saved" ? formatPreciseSessionUsd : undefined
            }
          />
        ))}
      </section>

      <ExperimentalSessionLog
        entries={entries}
        isError={isError}
        isLoading={isLoading}
      />

      <MethodologyLink />
    </div>
  )
}

function ExperimentalMetricTile({
  definition,
  value,
  valueFormatter,
}: {
  definition: MetricDefinitionPublic
  value: MetricValuePublic | undefined
  valueFormatter?: (value: string | number | null | undefined) => string
}) {
  const total = valueFormatter
    ? valueFormatter(value?.total)
    : formatMetricValue(value?.total, definition.presentation.format)
  const delta =
    definition.presentation.trend && value?.delta_vs_prev_window != null
      ? formatDelta(value.delta_vs_prev_window, definition.presentation.format)
      : null

  return (
    <div className="border border-border bg-background p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {definition.display_name}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {total}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-1 font-mono text-xs",
            delta.sign === "up" && "text-emerald-600 dark:text-emerald-400",
            delta.sign === "down" && "text-rose-600 dark:text-rose-400",
            delta.sign === "flat" && "text-muted-foreground",
          )}
        >
          {delta.sign === "flat"
            ? "No change"
            : `${delta.sign === "up" ? "▲" : "▼"} ${delta.label} vs previous`}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {definition.description}
      </p>
    </div>
  )
}

function ExperimentalRatioCell({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: string
}) {
  return (
    <div className={`min-w-0 p-4 ${className ?? ""}`}>
      <div className="truncate text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-1 font-mono text-xs uppercase tracking-[0.12em] opacity-70">
        {label}
      </div>
    </div>
  )
}

function ExperimentalBreakdownPanel({
  kicker,
  rows,
  title,
}: {
  kicker: string
  rows: NonNullable<MetricValuePublic["breakdown_by_source"]>
  title: string
}) {
  const maxTokens = Math.max(...rows.map((row) => row.tokens), 0)

  return (
    <section className="border border-border bg-background p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {kicker}
      </div>
      <h2 className="mt-1 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-border/70">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 py-2"
            >
              <div className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.label}</div>
                <div className="mt-1 h-1 bg-muted">
                  <div
                    className="h-1 bg-primary"
                    style={{
                      width:
                        maxTokens > 0
                          ? `${Math.max(4, Math.round((row.tokens / maxTokens) * 100))}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div className="text-right font-mono text-xs tabular-nums">
                {formatMetricValue(row.tokens, "compact-int")}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ExperimentalSessionLog({
  entries,
  isError,
  isLoading,
}: {
  entries: TaskforceSessionLogEntry[]
  isError: boolean
  isLoading: boolean
}) {
  return (
    <section className="border border-border bg-background p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Consult log
      </div>
      <h2 className="mt-1 text-sm font-semibold">Documents consulted</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading session log...
        </p>
      ) : isError ? (
        <p className="mt-4 text-sm text-destructive">
          Failed to load the session log.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No consulted documents were recorded for this session.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-border/70">
          <div className="grid grid-cols-[minmax(0,1.4fr)_4rem_5rem_7rem] gap-4 px-1 py-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground max-md:hidden">
            <div>Document</div>
            <div>Score</div>
            <div>Band</div>
            <div className="text-right">Net tokens</div>
          </div>
          {entries.map((entry) => (
            <article
              key={`${entry.query_id}-${entry.document_id}`}
              className="grid gap-2 px-1 py-3 md:grid-cols-[minmax(0,1.4fr)_4rem_5rem_7rem] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <Link
                  to="/v2/library/$documentId"
                  params={{ documentId: entry.document_id }}
                  className="block truncate text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
                >
                  {entry.title}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatSessionDate(entry.occurred_at)}
                </div>
              </div>
              <div className="font-mono text-xs tabular-nums">
                {formatScore(entry.score)}
              </div>
              <div>
                <Badge variant="outline">{entry.confidence_band}</Badge>
              </div>
              <div className="font-mono text-xs tabular-nums md:text-right">
                {entry.net_saved_tokens.toLocaleString()}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function formatHeroDelta(
  value: MetricValuePublic | undefined,
  format: MetricDefinitionPublic["presentation"]["format"],
) {
  const delta = formatDelta(value?.delta_vs_prev_window, format)
  if (!delta) return "No previous-period comparison yet"
  if (delta.sign === "flat") return "No change vs previous period"
  return `${delta.sign === "up" ? "▲" : "▼"} ${delta.label} vs previous period`
}

function formatRatioValue(value: number) {
  if (!Number.isFinite(value)) return "0"
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  })
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
