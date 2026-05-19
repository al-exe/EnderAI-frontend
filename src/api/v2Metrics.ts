import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export type MetricUnit = "tokens" | "usd" | "count" | "ratio"
export type MetricFormat = "compact-int" | "usd" | "ratio" | "count"
export type MetricsWindow = "7d" | "30d" | "all"
export type MetricsScope = "personal" | "organization"

export interface MetricPresentationPublic {
  format: MetricFormat
  trend: boolean
  icon: string | null
}

export interface MetricDefinitionPublic {
  name: string
  display_name: string
  unit: MetricUnit
  description: string
  presentation: MetricPresentationPublic
}

export interface MetricDefinitionsResponse {
  data: MetricDefinitionPublic[]
}

export interface MetricSeriesPoint {
  day: string
  value: string
}

export interface MetricBreakdownEntry {
  key: string
  label: string
  tokens: number
  usd: string
}

export interface MetricValuePublic {
  total: string
  delta_vs_prev_window: string | null
  series: MetricSeriesPoint[]
  breakdown_by_source: MetricBreakdownEntry[] | null
  top_models: MetricBreakdownEntry[] | null
}

export interface MetricsResponse {
  window: MetricsWindow
  from: string | null
  to: string
  scope: MetricsScope
  is_demo: boolean
  metrics: Record<string, MetricValuePublic>
}

export function readMetricDefinitions(): CancelablePromise<MetricDefinitionsResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/metrics/definitions",
  })
}

export interface ReadMetricsArgs {
  window?: MetricsWindow
  metrics?: string[]
  scope?: MetricsScope
  demo?: boolean
}

export function readMetrics(
  args: ReadMetricsArgs = {},
): CancelablePromise<MetricsResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/metrics",
    query: {
      window: args.window ?? "7d",
      scope: args.scope ?? "personal",
      demo: args.demo ?? false,
      ...(args.metrics && args.metrics.length > 0
        ? { metrics: args.metrics.join(",") }
        : {}),
    },
  })
}
