import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import {
  type MetricDefinitionPublic,
  type MetricsWindow,
  readMetricDefinitions,
  readMetrics,
} from "@/api/v2Metrics"
import type { UserPublic } from "@/client"
import { useDemoMode } from "@/components/demo-mode-provider"
import { MethodologyLink } from "./MethodologyLink"
import { MetricBreakdown } from "./MetricBreakdown"
import { MetricCard } from "./MetricCard"
import { MetricsTimeRange } from "./MetricsTimeRange"
import { MetricTrendChart } from "./MetricTrendChart"

type Props = {
  currentUser: UserPublic
}

const PRIMARY_METRICS = ["tokens_saved", "usd_saved", "reuse_rate"]
const SECONDARY_METRICS = ["tokens_consumed", "usd_consumed"]

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

function toMetricNumber(value: string | number | null | undefined) {
  if (value == null) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// Org-scope toggle is intentionally deferred. The backend supports
// scope=organization on /v2/metrics (admin-gated), but the generated
// OpenAPI client doesn't yet expose organization_id / organization_role
// on UserPublic in this repo. When the client is regenerated, restore
// the MetricsScopeToggle import and the `scope` state below.
export function MetricsPage({ currentUser: _currentUser }: Props) {
  const { isDemoMode } = useDemoMode()
  const [window, setWindow] = useState<MetricsWindow>("7d")

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

  const definitionsByName = useMemo(() => {
    const out: Record<string, MetricDefinitionPublic> = {}
    for (const d of definitionsQuery.data?.data ?? []) {
      out[d.name] = { ...d, ...METRIC_PRESENTATION_OVERRIDES[d.name] }
    }
    return out
  }, [definitionsQuery.data])

  const metrics = metricsQuery.data?.metrics ?? {}
  const tokensSaved = metrics.tokens_saved
  const tokensConsumed = metrics.tokens_consumed
  const usdOffset = toMetricNumber(metrics.usd_saved?.total)
  const usdSpent = toMetricNumber(metrics.usd_consumed?.total)
  const usdNetSaved = {
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
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Metrics</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MetricsTimeRange value={window} onChange={setWindow} />
        </div>
      </div>

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
        {PRIMARY_METRICS.map((name) => {
          const def = definitionsByName[name]
          if (!def) return null
          return (
            <MetricCard key={name} definition={def} value={metrics[name]} />
          )
        })}
      </section>

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
        {SECONDARY_METRICS.map((name) => {
          const def = definitionsByName[name]
          if (!def) return null
          return (
            <MetricCard key={name} definition={def} value={metrics[name]} />
          )
        })}
        <MetricCard definition={USD_NET_SAVED_DEFINITION} value={usdNetSaved} />
      </section>

      <section>
        <MetricBreakdown
          title="Top models by tokens used"
          rows={tokensConsumed?.top_models ?? []}
        />
      </section>
    </div>
  )
}
