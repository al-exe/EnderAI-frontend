import { Link } from "@tanstack/react-router"

import styles from "./Landing.module.css"

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerInner}>
          <Link
            aria-label="Taskforce landing"
            className={styles.footerBrand}
            hash="top"
            to="/landing"
          >
            <img
              alt=""
              className={styles.footerMark}
              src="/assets/brand/tf-icon-filled.svg"
            />
            Taskforce
          </Link>
          <div className={styles.footerLinks}>
            <a href="#library">Docs</a>
            <Link to="/pricing">Pricing</Link>
            <a href="#sessions">Changelog</a>
            <a href="#top">Privacy</a>
          </div>
          <span className={styles.copyright}>2026 Taskforce</span>
        </div>
      </div>
    </footer>
  )
}
