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
const SECONDARY_METRICS = [
  "tokens_consumed",
  "usd_consumed",
  "documents_touched",
]

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
      out[d.name] = d
    }
    return out
  }, [definitionsQuery.data])

  const metrics = metricsQuery.data?.metrics ?? {}
  const tokensSaved = metrics.tokens_saved
  const tokensConsumed = metrics.tokens_consumed
  const isEmpty =
    metricsQuery.isSuccess &&
    Object.values(metrics).every((m) => {
      const total = Number.parseFloat(m.total)
      return !Number.isFinite(total) || total === 0
    })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Tokens and dollars saved by Taskforce, plus what was consumed.
          </p>
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
