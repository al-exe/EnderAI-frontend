import { BarChart3 } from "lucide-react"

import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

const WEEKS = [
  { label: "W1", value: 52 },
  { label: "W2", value: 58 },
  { label: "W3", value: 65 },
  { label: "W4", value: 73 },
] as const

export function ProvenRoi() {
  return (
    <section className={styles.features} id="metrics">
      <div className={styles.wrap}>
        <div className={cn(styles.featureRow, styles.proofRow, styles.visualLeft)}>
          <div className={styles.featureCopy}>
            <div className={styles.featureLabel}>
              <span className={styles.featureIcon}>
                <BarChart3 />
              </span>
              <span>Metrics</span>
            </div>
            <h2>Proven ROI</h2>
            <p>
              Every reuse is on the record, measured with a transparent
              methodology — so the value your shared context returns is
              auditable, not asserted.
            </p>
          </div>
          <div className={styles.visual}>
            <div className={cn(styles.panel, styles.metricsCard)}>
              <div className={styles.panelHead}>
                <span>metrics</span>
                <span className={styles.spacer} />
                <span className={styles.chip}>12 repos</span>
              </div>
              <div className={styles.metricsBody}>
                <div className={styles.metricsHeroStat}>
                  <span>73%</span>
                  <b>rediscovery avoided</b>
                </div>
                <div className={styles.metricsSub}>
                  last 30 days - across 12 repos
                </div>
                <div aria-hidden className={styles.metricsBarChart}>
                  {WEEKS.map((week, index) => (
                    <div className={styles.metricsBarCol} key={week.label}>
                      <div className={styles.metricsBarTrack}>
                        <div
                          className={cn(
                            styles.metricsBarFill,
                            index === WEEKS.length - 1 &&
                              styles.metricsBarFillActive,
                          )}
                          style={{ height: `${(week.value / 80) * 100}%` }}
                        />
                      </div>
                      <span className={styles.metricsBarLabel}>
                        {week.label}
                      </span>
                    </div>
                  ))}
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
      </div>
    </section>
  )
}
