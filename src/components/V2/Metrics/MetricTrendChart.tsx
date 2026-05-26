import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { MetricSeriesPoint } from "@/api/v2Metrics"

type Props = {
  title: string
  series: MetricSeriesPoint[]
}

const PLOT_HEIGHT = 200
const PADDING_LEFT = 56
const PADDING_RIGHT = 12
const PADDING_TOP = 12
const PADDING_BOTTOM = 28
const MIN_PLOT_WIDTH = 280
const DEFAULT_PLOT_WIDTH = 600

type ChartLayout = {
  plotWidth: number
  plotHeight: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  paddingBottom: number
  innerWidth: number
  innerHeight: number
}

function getChartLayout(plotWidth: number): ChartLayout {
  const width = Math.max(plotWidth, MIN_PLOT_WIDTH)
  return {
    plotWidth: width,
    plotHeight: PLOT_HEIGHT,
    paddingLeft: PADDING_LEFT,
    paddingRight: PADDING_RIGHT,
    paddingTop: PADDING_TOP,
    paddingBottom: PADDING_BOTTOM,
    innerWidth: width - PADDING_LEFT - PADDING_RIGHT,
    innerHeight: PLOT_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
  }
}

function toNumber(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

const DAY_MS = 86_400_000

function parseDayUtc(day: string): number {
  const parsed = Date.parse(`${day}T00:00:00Z`)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function formatDay(day: string): string {
  const parsed = parseDayUtc(day)
  if (Number.isNaN(parsed)) return day
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed)
}

function formatDayFromTime(time: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(time)
}

type Plotted = {
  point: MetricSeriesPoint
  value: number
  x: number
  y: number
}

export function MetricTrendChart({ title, series }: Props) {
  const chartAreaRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState(DEFAULT_PLOT_WIDTH)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const layout = useMemo(() => getChartLayout(plotWidth), [plotWidth])

  useLayoutEffect(() => {
    const element = chartAreaRef.current
    if (!element) return

    const updateWidth = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width)
      if (nextWidth > 0) {
        setPlotWidth((current) =>
          current === nextWidth ? current : nextWidth,
        )
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { plotted, yMax, yMin, polylinePoints, areaPoints, minTime, timeSpan } =
    useMemo(() => {
      const {
        paddingLeft,
        paddingTop,
        innerWidth,
        innerHeight,
      } = layout

      if (series.length === 0) {
        return {
          plotted: [] as Plotted[],
          yMax: 1,
          yMin: 0,
          polylinePoints: "",
          areaPoints: "",
          minTime: 0,
          timeSpan: DAY_MS,
        }
      }
      const values = series.map((p) => toNumber(p.value))
      const rawMax = Math.max(...values, 0)
      const rawMin = Math.min(...values, 0)
      const maxNice = niceCeiling(rawMax || 1)
      const minNice = rawMin < 0 ? -niceCeiling(-rawMin) : 0
      const span = Math.max(maxNice - minNice, 1)

      const times = series.map((p) => parseDayUtc(p.day))
      const validTimes = times.filter((t) => !Number.isNaN(t))
      const minTime =
        validTimes.length > 0 ? Math.min(...validTimes) : 0
      const maxTime =
        validTimes.length > 0 ? Math.max(...validTimes) : minTime
      const timeSpan = Math.max(maxTime - minTime, DAY_MS)

      const plotted: Plotted[] = series.map((point, index) => {
        const value = values[index]
        const time = times[index]
        const x =
          series.length === 1 || Number.isNaN(time)
            ? paddingLeft + innerWidth / 2
            : paddingLeft + ((time - minTime) / timeSpan) * innerWidth
        const y =
          paddingTop + innerHeight - ((value - minNice) / span) * innerHeight
        return { point, value, x, y }
      })

      const polylinePoints = plotted
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ")
      const baselineY = paddingTop + innerHeight
      const areaPoints = [
        `${plotted[0].x.toFixed(1)},${baselineY.toFixed(1)}`,
        ...plotted.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
        `${plotted[plotted.length - 1].x.toFixed(1)},${baselineY.toFixed(1)}`,
      ].join(" ")

      return {
        plotted,
        yMax: maxNice,
        yMin: minNice,
        polylinePoints,
        areaPoints,
        minTime,
        timeSpan,
      }
    }, [layout, series])

  if (series.length === 0) {
    return (
      <div className="min-w-0 w-full rounded-lg border border-border bg-background p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">No data in this window.</p>
      </div>
    )
  }

  const yTicks = buildYTicks(yMin, yMax, 4)
  const xTickTimes = buildXTickTimes(minTime, minTime + timeSpan, 6)
  const baselineY = layout.paddingTop + layout.innerHeight
  const hovered = hoverIndex != null ? plotted[hoverIndex] : null

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (plotted.length === 0) return
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const ratioX = (event.clientX - rect.left) / rect.width
    const svgX = ratioX * layout.plotWidth
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < plotted.length; i++) {
      const dist = Math.abs(plotted[i].x - svgX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    }
    setHoverIndex(nearest)
  }

  return (
    <div className="min-w-0 w-full rounded-lg border border-border bg-background p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <div ref={chartAreaRef} className="relative w-full min-w-0">
        <svg
          role="img"
          aria-label={title}
          viewBox={`0 0 ${layout.plotWidth} ${layout.plotHeight}`}
          width={layout.plotWidth}
          height={layout.plotHeight}
          className="block w-full"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <title>{title}</title>
          {yTicks.map((tick) => {
            const y =
              layout.paddingTop +
              layout.innerHeight -
              ((tick - yMin) / Math.max(yMax - yMin, 1)) * layout.innerHeight
            return (
              <g key={tick}>
                <line
                  x1={layout.paddingLeft}
                  x2={layout.plotWidth - layout.paddingRight}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={layout.paddingLeft - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="currentColor"
                  fillOpacity="0.6"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            )
          })}

          <line
            x1={layout.paddingLeft}
            x2={layout.paddingLeft}
            y1={layout.paddingTop}
            y2={baselineY}
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={layout.paddingLeft}
            x2={layout.plotWidth - layout.paddingRight}
            y1={baselineY}
            y2={baselineY}
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {plotted.length > 1 && (
            <polygon
              points={areaPoints}
              fill="currentColor"
              fillOpacity="0.08"
            />
          )}
          {plotted.length > 1 && (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              points={polylinePoints}
            />
          )}
          {plotted.map((p, idx) => (
            <circle
              key={p.point.day}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 4 : 2.5}
              fill="currentColor"
              fillOpacity={hoverIndex === idx ? 1 : 0.7}
            />
          ))}

          {hovered && (
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={layout.paddingTop}
              y2={baselineY}
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeDasharray="4 4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {xTickTimes.map((tickTime, index) => {
            const x =
              layout.paddingLeft +
              ((tickTime - minTime) / timeSpan) * layout.innerWidth
            return (
              <text
                key={tickTime}
                x={x}
                y={baselineY + 16}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === xTickTimes.length - 1
                      ? "end"
                      : "middle"
                }
                fontSize="10"
                fill="currentColor"
                fillOpacity="0.6"
              >
                {formatDayFromTime(tickTime)}
              </text>
            )
          })}

          {hovered && (
            <foreignObject
              x={Math.min(
                Math.max(hovered.x - 60, layout.paddingLeft),
                layout.plotWidth - layout.paddingRight - 120,
              )}
              y={Math.max(hovered.y - 52, 0)}
              width="120"
              height="48"
              pointerEvents="none"
            >
              <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md">
                <div className="font-medium leading-tight">
                  {formatDay(hovered.point.day)}
                </div>
                <div className="leading-tight text-muted-foreground">
                  {formatNumber(hovered.value)}{" "}
                  {hovered.value === 1 ? "token" : "tokens"}
                </div>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  )
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  let nice: number
  if (normalized <= 1) nice = 1
  else if (normalized <= 2) nice = 2
  else if (normalized <= 5) nice = 5
  else nice = 10
  return nice * magnitude
}

function buildYTicks(min: number, max: number, count: number): number[] {
  if (max === min) return [min]
  const step = (max - min) / count
  const ticks: number[] = []
  for (let i = 0; i <= count; i++) {
    ticks.push(min + step * i)
  }
  return ticks
}

function buildXTickTimes(
  minTime: number,
  maxTime: number,
  maxTicks: number,
): number[] {
  const spanDays = Math.round((maxTime - minTime) / DAY_MS) + 1

  if (spanDays <= maxTicks) {
    return Array.from({ length: spanDays }, (_, i) => minTime + i * DAY_MS)
  }

  const niceDaySteps = [1, 2, 3, 5, 7, 14, 30]
  const stepDays =
    niceDaySteps.find((step) => Math.ceil(spanDays / step) <= maxTicks) ??
    Math.max(1, Math.ceil(spanDays / maxTicks))

  const ticks: number[] = []
  for (let t = minTime; t <= maxTime; t += stepDays * DAY_MS) {
    ticks.push(t)
  }

  const lastTick = ticks[ticks.length - 1]
  if (lastTick < maxTime) {
    ticks.push(maxTime)
  }

  return ticks
}
