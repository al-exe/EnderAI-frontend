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
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 320 132"
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
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--landing-primary)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <g className={styles.chartGrid}>
                    <line x1="44" x2="304" y1="20" y2="20" />
                    <line x1="44" x2="304" y1="52" y2="52" />
                    <line x1="44" x2="304" y1="84" y2="84" />
                  </g>
                  <g className={styles.chartAxis}>
                    <line x1="44" x2="44" y1="12" y2="100" />
                    <line x1="44" x2="304" y1="100" y2="100" />
                  </g>
                  <g className={styles.chartLabels}>
                    <text x="10" y="24">
                      80%
                    </text>
                    <text x="10" y="56">
                      60%
                    </text>
                    <text x="10" y="88">
                      40%
                    </text>
                    <text x="44" y="122">
                      W1
                    </text>
                    <text x="124" y="122">
                      W2
                    </text>
                    <text x="204" y="122">
                      W3
                    </text>
                    <text x="284" y="122">
                      W4
                    </text>
                  </g>
                  <path
                    className={styles.chartArea}
                    d="M44 88 L76 84 L108 77 L140 72 L172 61 L204 54 L236 43 L268 34 L304 24 L304 100 L44 100 Z"
                  />
                  <path
                    className={styles.chartLine}
                    d="M44 88 L76 84 L108 77 L140 72 L172 61 L204 54 L236 43 L268 34 L304 24"
                  />
                  <g className={styles.chartPoints}>
                    <circle cx="44" cy="88" r="3" />
                    <circle cx="108" cy="77" r="3" />
                    <circle cx="172" cy="61" r="3" />
                    <circle cx="236" cy="43" r="3" />
                    <circle cx="304" cy="24" r="3.5" />
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
