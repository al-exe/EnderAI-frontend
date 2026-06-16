import { Link } from "@tanstack/react-router"
import { ArrowRight, ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

const SCENES = [
  {
    key: "Fleet",
    name: "Orchestration",
    phrase: ["losing track", "of your agents."],
  },
  {
    key: "Profiles",
    name: "Agent profiles",
    phrase: ["re-briefing", "every agent."],
  },
  {
    key: "Library",
    name: "Self-updating documents",
    phrase: ["re-explaining", "your codebase."],
  },
  {
    key: "Ledger",
    name: "Audit trail",
    phrase: ["guessing what", "agents did."],
  },
  {
    key: "Metrics",
    name: "Proven ROI",
    phrase: ["flying blind", "on AI spend."],
  },
] as const

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(query.matches)

    const onChange = () => setPrefersReducedMotion(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return prefersReducedMotion
}

function useRevealClass() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || !("IntersectionObserver" in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return {
    className: cn(styles.reveal, isVisible && styles.revealIn),
    ref,
  }
}

export function LandingHero() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isSwapping, setIsSwapping] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const copyReveal = useRevealClass()
  const termReveal = useRevealClass()
  const swapTimer = useRef<number | null>(null)
  const scene = SCENES[sceneIndex]

  const selectScene = useCallback(
    (nextIndex: number) => {
      if (nextIndex === sceneIndex) return
      if (swapTimer.current) {
        window.clearTimeout(swapTimer.current)
      }

      if (reducedMotion) {
        setSceneIndex(nextIndex)
        setIsSwapping(false)
        return
      }

      setIsSwapping(true)
      swapTimer.current = window.setTimeout(() => {
        setSceneIndex(nextIndex)
        setIsSwapping(false)
        swapTimer.current = null
      }, 270)
    },
    [reducedMotion, sceneIndex],
  )

  useEffect(() => {
    if (reducedMotion) return
    const interval = window.setInterval(() => {
      selectScene((sceneIndex + 1) % SCENES.length)
    }, 4400)

    return () => window.clearInterval(interval)
  }, [reducedMotion, sceneIndex, selectScene])

  useEffect(() => {
    return () => {
      if (swapTimer.current) {
        window.clearTimeout(swapTimer.current)
      }
    }
  }, [])

  const phrase = useMemo(
    () => (
      <>
        {scene.phrase[0]}
        <br />
        {scene.phrase[1]}
      </>
    ),
    [scene],
  )

  return (
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        <div className={styles.wrap}>
          <div className={styles.heroSplit}>
            <div
              className={cn(styles.heroCopy, copyReveal.className)}
              ref={copyReveal.ref}
            >
              <span className={styles.eyebrow}>
                AI work memory for engineering teams
              </span>
              <h1 className={cn(isSwapping && styles.swapping)}>
                <span className={styles.lead}>Stop </span>
                <span className={styles.phrase}>{phrase}</span>
              </h1>
              <div
                className={cn(styles.heroCap, isSwapping && styles.swapping)}
              >
                <span className={styles.capKey}>{scene.key}</span>
                <span className={styles.capSep}>·</span>
                <span>{scene.name}</span>
              </div>
              <div
                aria-label="Capabilities"
                className={styles.heroDots}
                role="tablist"
              >
                {SCENES.map((item, index) => (
                  <button
                    aria-label={item.key}
                    aria-selected={sceneIndex === index}
                    className={cn(sceneIndex === index && styles.activeDot)}
                    key={item.key}
                    onClick={() => selectScene(index)}
                    role="tab"
                    type="button"
                  />
                ))}
              </div>
              <div className={styles.works}>
                Works with Claude Code, Codex, and Cursor.
              </div>
              <div className={styles.heroCtas}>
                <Button asChild className={styles.solidButton}>
                  <Link to="/signup">
                    Start free
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  className={styles.outlineButton}
                  variant="outline"
                >
                  <Link to="/login">Open Taskforce</Link>
                </Button>
              </div>
            </div>

            <div
              className={cn(styles.heroTerm, termReveal.className)}
              ref={termReveal.ref}
            >
              <HeroTerminal sceneIndex={sceneIndex} />
            </div>
          </div>
        </div>
      </div>

      <a
        aria-label="Scroll to capabilities"
        className={styles.scrollCue}
        href="#fleet"
      >
        <span className={styles.cueRule} />
        <span className={styles.cueArrow}>
          <ChevronDown />
        </span>
        <span className={styles.cueRule} />
      </a>
    </section>
  )
}

function HeroTerminal({ sceneIndex }: { sceneIndex: number }) {
  const scenes = [
    <FleetScene key="fleet" />,
    <ProfilesScene key="profiles" />,
    <LibraryScene key="library" />,
    <LedgerScene key="ledger" />,
    <MetricsScene key="metrics" />,
  ]

  return (
    <div className={styles.term}>
      <div className={styles.termHead}>
        <span className={styles.termDot} />
        <span className={styles.termName}>taskforce - live</span>
        <span className={styles.liveStatus}>
          <span />
          connected
        </span>
      </div>
      <div className={styles.termBody}>
        {scenes.map((scene, index) => (
          <div
            className={cn(
              styles.terminalScene,
              sceneIndex === index && styles.terminalSceneActive,
            )}
            key={scene.key}
          >
            {scene}
          </div>
        ))}
      </div>
    </div>
  )
}

function FleetScene() {
  return (
    <>
      <div className={styles.tlFleet}>
        <span>checkout-squad</span>
        <span>3 agents</span>
      </div>
      <TerminalAgent
        name="tax-refactor"
        status="running"
        tool="claude - vm-04"
      />
      <TerminalAgent name="checkout-e2e" status="14/20" tool="codex - term-2" />
      <div className={styles.tlFleet}>
        <span>platform</span>
        <span>3 agents</span>
      </div>
      <TerminalAgent
        accent="amber"
        name="migrate-pg16"
        status="review"
        tool="cursor - vm-01"
      />
      <TerminalAgent
        name="api-deprecation"
        status="38 left"
        tool="claude - vm-02"
      />
      <div className={styles.termLine}>
        <span className={styles.termAccent}>live -</span>{" "}
        <span className={styles.termDim}>
          tax-refactor referenced "Stripe checkout wiring"
        </span>
      </div>
      <SummaryGrid
        items={[
          ["fleet", "6 active", true],
          ["across", "3 terminals - 3 VMs"],
          ["context", "shared"],
        ]}
      />
    </>
  )
}

function ProfilesScene() {
  return (
    <>
      <Conversation who="you">
        how do we handle stripe tax for new subscribers?
      </Conversation>
      <Conversation dim who="tf">
        matching prompt to a specialist profile...
      </Conversation>
      <Conversation who="tf">
        <span className={styles.termAccent}>Jensen - Billing Reliability</span>{" "}
        - confidence <span className={styles.termGreen}>high</span>
      </Conversation>
      <Conversation dim who="tf">
        pulling linked knowledge:{" "}
        <span className={styles.termAccent}>Stripe checkout wiring</span>,{" "}
        <span className={styles.termAccent}>tax-rates rollout</span>
      </Conversation>
      <Conversation who="tf">
        briefing applied - role{" "}
        <span className={styles.termAccent}>billing & checkout</span> - 38 docs
        linked
      </Conversation>
      <SummaryGrid
        items={[
          ["routed to", "Jensen", true],
          ["role", "billing & checkout"],
          ["route match", "96%"],
        ]}
      />
    </>
  )
}

function LibraryScene() {
  return (
    <>
      <Conversation who="you">apply the annual-plan tax pattern</Conversation>
      <Conversation dim who="tf">
        recalling{" "}
        <span className={styles.termAccent}>Stripe checkout wiring</span> +{" "}
        <span className={styles.termAccent}>tax-rates rollout</span>...
      </Conversation>
      <Conversation who="tf">
        attach{" "}
        <span className={styles.termAccent}>
          automatic_tax: {"{ enabled: true }"}
        </span>{" "}
        on signup - see section 3
      </Conversation>
      <Conversation dim who="tf">
        writing patch - <span className={styles.termGreen}>0 tokens</span> spent
        on rediscovery
      </Conversation>
      <Conversation dim who="tf">
        recording session back to Taskforce...
      </Conversation>
      <Conversation who="ok">
        <span className={styles.termAccent}>checkout.md</span> updated
        automatically
      </Conversation>
      <SummaryGrid
        items={[
          ["referenced", "2 docs", true],
          ["recorded", "session -> Taskforce"],
        ]}
      />
    </>
  )
}

function LedgerScene() {
  return (
    <>
      <div className={styles.searchLine}>
        <span className={styles.termAccent}>search -</span> referenced:
        <span className={styles.termHighlight}>"Stripe checkout wiring"</span>
        <span className={styles.termCursor} />
      </div>
      <div className={styles.ledgerHead}>
        <span>time</span>
        <span>session - activity</span>
        <span>ref</span>
      </div>
      <TerminalLedgerRow
        activity="Patched annual plan tax"
        refName="checkout.md"
        session="cursor-tax-refactor"
        time="2:14 PM"
      />
      <TerminalLedgerRow
        activity="Ran 20 E2E specs"
        refName="tax-rates.md"
        session="claude-checkout-e2e"
        time="1:47 PM"
      />
      <TerminalLedgerRow
        activity="Added EU no-VAT guard"
        refName="checkout.md"
        session="codex-vat-fallback"
        time="11:02"
      />
      <TerminalLedgerRow
        activity="Reviewed webhook retries"
        refName="webhooks.md"
        session="cursor-billing-audit"
        time="9:30 AM"
      />
      <SummaryGrid
        items={[
          ["archived", "12,408", true],
          ["sessions", "fully searchable"],
        ]}
      />
    </>
  )
}

function MetricsScene() {
  return (
    <>
      <Conversation dim who="tf">
        rollup - last 30 days - across 12 repos
      </Conversation>
      <div className={styles.metricBig}>
        <span className={styles.termAccent}>73%</span>
        <span>rediscovery avoided</span>
      </div>
      <MetricTerminalRow label="tokens saved / wk" value="2.4M" />
      <MetricTerminalRow
        label="dollars saved / wk"
        value="$1,840"
        valueClassName={styles.termGreen}
      />
      <MetricTerminalRow label="eng time / wk" value="31 hrs" />
      <div className={cn(styles.termLine, styles.termDim)}>
        measured vs cold-start baselines -{" "}
        <span className={styles.termAccent}>methodology</span> -{" "}
        <span className={styles.termAccent}>session #a4f2</span>
      </div>
      <SummaryGrid
        items={[
          ["saved / wk", "$1,840", true],
          ["tokens", "2.4M"],
          ["basis", "12 repos"],
        ]}
      />
    </>
  )
}

function TerminalAgent({
  accent = "green",
  name,
  status,
  tool,
}: {
  accent?: "green" | "amber"
  name: string
  status: string
  tool: string
}) {
  return (
    <div className={cn(styles.termLine, styles.termAgent)}>
      <span
        className={cn(
          styles.statusDot,
          accent === "green" ? styles.greenDot : styles.amberDot,
        )}
      />
      <span className={styles.agentName}>{name}</span>
      <span className={styles.agentHost}>{tool}</span>
      <span className={styles.agentState}>{status}</span>
    </div>
  )
}

function Conversation({
  children,
  dim = false,
  who,
}: {
  children: ReactNode
  dim?: boolean
  who: "ok" | "tf" | "you"
}) {
  return (
    <div className={cn(styles.termLine, styles.conversation)}>
      <span className={styles[`${who}Who`]}>{who === "ok" ? "ok" : who}</span>
      <span className={cn(dim && styles.termDim)}>{children}</span>
    </div>
  )
}

function TerminalLedgerRow({
  activity,
  refName,
  session,
  time,
}: {
  activity: string
  refName: string
  session: string
  time: string
}) {
  return (
    <div className={cn(styles.termLine, styles.ledgerRow)}>
      <span className={styles.ledgerTime}>{time}</span>
      <span>
        <span className={styles.termDim}>{session}</span> {activity}
      </span>
      <span className={styles.ledgerRef}>{refName}</span>
    </div>
  )
}

function MetricTerminalRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className={cn(styles.termLine, styles.metricRow)}>
      <span>{label}</span>
      <span className={valueClassName ?? styles.termAccent}>{value}</span>
    </div>
  )
}

function SummaryGrid({
  items,
}: {
  items: Array<[label: string, value: string, big?: boolean]>
}) {
  return (
    <div className={styles.termSummary}>
      {items.map(([label, value, big]) => (
        <div key={label}>
          <div className={styles.summaryKey}>{label}</div>
          <div className={cn(styles.summaryValue, big && styles.summaryBig)}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
