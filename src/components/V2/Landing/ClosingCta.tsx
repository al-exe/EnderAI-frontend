import styles from "./Landing.module.css"

export function ClosingCta() {
  return (
    <section className={styles.ctaBand}>
      <div className={styles.ctaInner}>
        <h2>
          Stop starting from <em className={styles.ctaScratch}>scratch</em>.
          Start using <em>Taskforce</em>.
        </h2>
      </div>
    </section>
  )
}
