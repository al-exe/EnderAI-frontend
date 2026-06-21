import { Link } from "@tanstack/react-router"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

import styles from "./Landing.module.css"

const navItems = [
  { href: "#sessions", label: "Orchestration" },
  { href: "#profiles", label: "Profiles" },
  { href: "#library", label: "Docs" },
  { href: "#ledger", label: "Audit" },
  { href: "#metrics", label: "Metrics" },
]

const THEME_KEY = "tf-landing-theme"

function readSavedTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

export function LandingNav() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = readSavedTheme()
    if (saved === "dark") {
      document.documentElement.classList.add("dark")
      setIsDark(true)
      return
    }
    document.documentElement.classList.remove("dark")
    setIsDark(false)
  }, [])

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", nextIsDark)
    setIsDark(nextIsDark)
    try {
      window.localStorage.setItem(THEME_KEY, nextIsDark ? "dark" : "light")
    } catch {
      // Ignore storage errors; theme still changes for this session.
    }
  }

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
          <Button
            aria-label="Toggle theme"
            aria-pressed={isDark}
            className={styles.themeToggle}
            onClick={toggleTheme}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            {isDark ? <Moon /> : <Sun />}
          </Button>
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
