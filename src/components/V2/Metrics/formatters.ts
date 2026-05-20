import type { MetricFormat } from "@/api/v2Metrics"

const compactInt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const count = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const ratioPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
})

const deltaPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 1,
})

const deltaAbs = new Intl.NumberFormat("en-US", {
  signDisplay: "exceptZero",
  maximumFractionDigits: 2,
})

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatMetricValue(
  value: string | number | null | undefined,
  format: MetricFormat,
): string {
  const n = toNumber(value)
  switch (format) {
    case "compact-int":
      return compactInt.format(n)
    case "usd":
      return usd.format(n)
    case "ratio":
      return ratioPct.format(n)
    case "count":
      return count.format(n)
    default:
      return String(n)
  }
}

export function formatDelta(
  value: string | number | null | undefined,
  format: MetricFormat,
): { label: string; sign: "up" | "down" | "flat" } | null {
  if (value == null) return null
  const n = toNumber(value)
  if (!Number.isFinite(n)) return null
  const sign = n > 0 ? "up" : n < 0 ? "down" : "flat"
  if (format === "ratio") {
    return { label: `${deltaAbs.format(n * 100)} percentage points`, sign }
  }
  return { label: deltaPct.format(n), sign }
}
