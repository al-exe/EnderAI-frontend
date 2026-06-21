import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import styles from "./Landing.module.css"

const navItems = [
  { href: "#sessions", label: "Sessions" },
  { href: "#profiles", label: "Profiles" },
  { href: "#library", label: "Library" },
  { href: "#ledger", label: "Ledger" },
  { href: "#metrics", label: "Metrics" },
]

export function LandingNav() {
  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link
          aria-label="Taskforce landing"
          className={styles.brand}
          hash="top"
          to="/landing"
        >
          <img
            alt=""
            className={styles.brandMark}
            src="/assets/brand/tf-icon-filled.svg"
          />
          <span>Taskforce</span>
        </Link>

        <nav aria-label="Landing sections" className={styles.navLinks}>
          {navItems.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.navRight}>
          <div className={styles.navCta}>
            <Button asChild className={styles.outlineButton} variant="outline">
              <Link to="/login">Open Taskforce</Link>
            </Button>
            <Button asChild className={styles.solidButton}>
              <Link to="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
