import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

export function ClosingCta() {
  return (
    <section className={styles.ctaBand}>
      <div className={styles.ctaInner}>
        <h2>
          Stop starting from <em className={styles.ctaScratch}>scratch</em>.
          Start using <em>Taskforce</em>.
        </h2>
        <div className={cn(styles.heroCtas, styles.ctaActions)}>
          <Button asChild className={styles.solidButton}>
            <Link to="/signup">
              Start free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild className={styles.outlineButton} variant="outline">
            <Link to="/login">Open Taskforce</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
