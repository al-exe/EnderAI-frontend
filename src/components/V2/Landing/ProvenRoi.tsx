import { BarChart3 } from "lucide-react"

import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

export function ProvenRoi() {
  return (
    <section className={styles.features} id="metrics">
      <div className={styles.wrap}>
        <div
          className={cn(styles.featureRow, styles.proofRow, styles.proofRowStacked)}
        >
          <div className={styles.featureCopy}>
            <div className={styles.featureLabel}>
              <span className={styles.featureIcon}>
                <BarChart3 />
              </span>
              <span>Metrics</span>
            </div>
            <h2>Proven ROI</h2>
            <p>
              Measure the tokens and engineering time your agents save with
              Taskforce-powered shared context and knowledge. Use a transparent
              methodology to understand what Taskforce returns across your work.
            </p>
          </div>
          <div className={styles.visual}>
            <div className={cn(styles.panel, styles.metricsCard)}>
              <div className={styles.metricsHeroStat}>
                <span>73%</span>
                <b>rediscovery avoided</b>
              </div>
              <div className={styles.metricsSub}>
                last 30 days - across 12 repos
              </div>
              <div className={styles.chart}>
                <svg
                  aria-hidden="true"
                  className={styles.metricsChartSvg}
                  preserveAspectRatio="none"
                  viewBox="0 0 100 50"
                >
                  <defs>
                    <linearGradient
                      id="rediscovery-gradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--landing-primary)"
                        stopOpacity="0.24"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--landing-primary)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <g className={styles.chartGrid}>
                    <line x1="7" x2="100" y1="12" y2="12" />
                    <line x1="7" x2="100" y1="24" y2="24" />
                    <line x1="7" x2="100" y1="36" y2="36" />
                  </g>
                  <g className={styles.chartAxis}>
                    <line x1="7" x2="100" y1="42" y2="42" />
                  </g>
                  <g className={styles.chartLabels}>
                    <text textAnchor="start" x="0" y="10.5">
                      80%
                    </text>
                    <text textAnchor="start" x="0" y="22.5">
                      60%
                    </text>
                    <text textAnchor="start" x="0" y="34.5">
                      40%
                    </text>
                    <text textAnchor="start" x="7" y="47.5">
                      W1
                    </text>
                    <text textAnchor="middle" x="38" y="47.5">
                      W2
                    </text>
                    <text textAnchor="middle" x="69" y="47.5">
                      W3
                    </text>
                    <text textAnchor="end" x="100" y="47.5">
                      W4
                    </text>
                  </g>
                  <path
                    className={styles.chartArea}
                    d="M7 33.2 L38 29.6 L69 25.2 L100 20.4 L100 42 L7 42 Z"
                  />
                  <path
                    className={styles.chartLine}
                    d="M7 33.2 L38 29.6 L69 25.2 L100 20.4"
                  />
                  <g className={styles.chartPoints}>
                    <circle cx="7" cy="33.2" r="0.9" />
                    <circle cx="38" cy="29.6" r="0.9" />
                    <circle cx="69" cy="25.2" r="0.9" />
                    <circle cx="100" cy="20.4" r="1.05" />
                  </g>
                </svg>
              </div>
              <div className={styles.metricsTiles}>
                <div className={styles.statTile}>
                  <div>2.4M</div>
                  <span>Tokens saved / wk</span>
                </div>
                <div className={styles.statTile}>
                  <div>31 hrs</div>
                  <span>Eng time / wk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
