import { BarChart3, Info } from "lucide-react"

import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

export function ProvenRoi() {
  return (
    <section className={styles.features} id="metrics">
      <div className={styles.wrap}>
        <div
          className={cn(styles.featureRow, styles.proofRow, styles.visualLeft)}
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
              Measure the tokens and engineering time your agents save. Use a
              transparent methodology to understand what Taskforce returns
              across your work.
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
                  preserveAspectRatio="none"
                  viewBox="0 0 280 64"
                >
                  <polyline
                    fill="none"
                    points="0,52 28,49 56,44 84,46 112,38 140,33 168,30 196,22 224,18 252,12 280,8"
                    stroke="var(--landing-primary)"
                    strokeWidth="1.6"
                  />
                  <polyline
                    fill="none"
                    points="0,52 280,48"
                    stroke="var(--landing-faint)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
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
              <div className={styles.metricsMethod}>
                <Info />
                Measured against cold-start baselines -{" "}
                <a href="#metrics">methodology</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
