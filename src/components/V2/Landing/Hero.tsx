import { Link } from "@tanstack/react-router"
import { ArrowRight, ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

const SCENES = [
  {
    key: "Sessions",
    name: "Orchestration",
    phrase: ["losing track", "of your agents."],
  },
  {
    key: "Profiles",
    name: "Agent identities",
    phrase: ["re-briefing", "every agent."],
  },
  {
    key: "Library",
    name: "Self-maintaining documents",
    phrase: ["re-explaining", "your codebase."],
  },
  {
    key: "Ledger",
    name: "Audit trail",
    phrase: ["guessing what", "your agents did."],
  },
  {
    key: "Metrics",
    name: "Proven ROI",
    phrase: ["flying blind", "on AI spend."],
  },
] as const

const SCENE_COMMANDS = [
  "tf sessions --live",
  'tf route "stripe tax for new subscribers"',
  'tf recall "annual-plan tax pattern"',
  'tf ledger --ref "Stripe checkout wiring"',
  "tf metrics --last 30d",
] as const

const HERO_ROTATION_MS = 5600
const HERO_CLICK_PAUSE_MS = 12_000
const TYPE_SPEED_MS = 30
const OUTPUT_DELAY_MS = 220

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
  const pauseUntilRef = useRef(0)
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
      if (Date.now() < pauseUntilRef.current) return
      selectScene((sceneIndex + 1) % SCENES.length)
    }, HERO_ROTATION_MS)

    return () => window.clearInterval(interval)
  }, [reducedMotion, sceneIndex, selectScene])

  const selectSceneFromDot = (nextIndex: number) => {
    pauseUntilRef.current = Date.now() + HERO_CLICK_PAUSE_MS
    if (nextIndex !== sceneIndex) {
      selectScene(nextIndex)
    }
  }

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
              <h1 className={cn(isSwapping && styles.swapping)}>
                <span className={styles.lead}>Stop </span>
                <span className={styles.phrase}>{phrase}</span>
              </h1>
              <div className={styles.heroSwitcher}>
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
                      onClick={() => selectSceneFromDot(index)}
                      role="tab"
                      type="button"
                    />
                  ))}
                </div>
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
              <HeroTerminal
                reducedMotion={reducedMotion}
                sceneIndex={sceneIndex}
              />
            </div>
          </div>
        </div>
      </div>

      <a
        aria-label="Scroll to capabilities"
        className={styles.scrollCue}
        href="#sessions"
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

function HeroTerminal({
  reducedMotion,
  sceneIndex,
}: {
  reducedMotion: boolean
  sceneIndex: number
}) {
  const scenes = [
    <SessionsScene key="sessions" />,
    <ProfilesScene key="profiles" />,
    <LibraryScene key="library" />,
    <LedgerScene key="ledger" />,
    <MetricsScene key="metrics" />,
  ]

  const command = SCENE_COMMANDS[sceneIndex]
  const [typed, setTyped] = useState("")
  const [showOutput, setShowOutput] = useState(false)

  // Type the command character by character, then reveal the output below it.
  useEffect(() => {
    if (reducedMotion) {
      setTyped(command)
      setShowOutput(true)
      return
    }

    setTyped("")
    setShowOutput(false)

    let index = 0
    let outputTimer: number | undefined
    const typeTimer = window.setInterval(() => {
      index += 1
      setTyped(command.slice(0, index))
      if (index >= command.length) {
        window.clearInterval(typeTimer)
        outputTimer = window.setTimeout(
          () => setShowOutput(true),
          OUTPUT_DELAY_MS,
        )
      }
    }, TYPE_SPEED_MS)

    return () => {
      window.clearInterval(typeTimer)
      if (outputTimer) window.clearTimeout(outputTimer)
    }
  }, [command, reducedMotion])

  return (
    <div className={styles.term}>
      <div className={styles.termHead}>
        <span className={styles.termDot} />
        <span className={styles.termName}>tf · taskforce</span>
        <span className={styles.termStatus}>
          <span />
          connected
        </span>
      </div>
      <div className={styles.termBody}>
        <div className={styles.cmd}>
          <span className={styles.cmdSign}>$</span>
          <span className={styles.cmdText}>{typed}</span>
          <span className={cn(styles.caret, showOutput && styles.caretIdle)} />
        </div>
        <div className={styles.termScenes}>
          {scenes.map((scene, index) => (
            <div
              className={cn(
                styles.terminalScene,
                sceneIndex === index &&
                  showOutput &&
                  styles.terminalSceneActive,
              )}
              key={scene.key}
            >
              {scene}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SessionsScene() {
  return (
    <>
      <SessionGroup count="3 agents" name="checkout-squad" />
      <SessionRow name="tax-refactor" state="running" tool="claude · vm-04" />
      <SessionRow name="checkout-e2e" state="14/20" tool="codex · term-2" />
      <SessionGroup count="3 agents" name="platform" />
      <SessionRow
        accent="amber"
        name="migrate-pg16"
        state="review"
        tool="cursor · vm-01"
      />
      <SessionRow
        name="api-deprecation"
        state="38 left"
        tool="claude · vm-02"
      />
      <SummaryGrid
        items={[
          ["sessions", "6 active", true],
          ["across", "3 VMs"],
          ["context", "shared"],
        ]}
      />
    </>
  )
}

function ProfilesScene() {
  return (
    <>
      <Field label="matched">
        <span className={styles.accent}>Jensen · Billing Reliability</span>
      </Field>
      <Field label="confidence">
        <span className={styles.green}>high</span> · 96% route match
      </Field>
      <Field label="linked">
        <span className={styles.accent}>Stripe checkout wiring</span>,{" "}
        <span className={styles.accent}>tax-rates rollout</span>
      </Field>
      <Field label="briefing">
        role <span className={styles.accent}>billing & checkout</span> · 38 docs
      </Field>
      <Status>profile applied to this session</Status>
      <SummaryGrid
        items={[
          ["routed to", "Jensen", true],
          ["role", "billing & checkout"],
          ["match", "96%"],
        ]}
      />
    </>
  )
}

function LibraryScene() {
  return (
    <>
      <Field label="reading">
        <span className={styles.accent}>Stripe checkout wiring</span> ·{" "}
        <span className={styles.accent}>tax-rates rollout</span>
      </Field>
      <Field label="apply">
        <span className={styles.accent}>
          automatic_tax: {"{ enabled: true }"}
        </span>{" "}
        <span className={styles.dim}>(§3)</span>
      </Field>
      <Field label="cost">
        <span className={styles.green}>0 tokens</span> spent on rediscovery
      </Field>
      <Field label="write">
        <span className={styles.accent}>checkout.md</span> updated automatically
      </Field>
      <Status>session recorded back to Taskforce</Status>
      <SummaryGrid
        items={[
          ["referenced", "2 docs", true],
          ["rediscovery", "0 tokens"],
        ]}
      />
    </>
  )
}

function LedgerScene() {
  return (
    <>
      <div className={styles.ledgerHead}>
        <span>time</span>
        <span>session</span>
        <span>activity</span>
        <span>ref</span>
      </div>
      <LedgerRow
        activity="Patched annual plan tax"
        refName="checkout.md"
        session="cursor·tax-refactor"
        time="2:14 PM"
      />
      <LedgerRow
        activity="Ran 20 E2E specs"
        refName="tax-rates.md"
        session="claude·checkout-e2e"
        time="1:47 PM"
      />
      <LedgerRow
        activity="Added EU no-VAT guard"
        refName="checkout.md"
        session="codex·vat-fallback"
        time="11:02 AM"
      />
      <LedgerRow
        activity="Reviewed webhook retries"
        refName="webhooks.md"
        session="cursor·billing-audit"
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
      <div className={styles.metricBig}>
        <span>73%</span>
        <span>rediscovery avoided · across 12 repos</span>
      </div>
      <MetricRow label="tokens saved / wk" value="2.4M" />
      <MetricRow
        label="dollars saved / wk"
        value="$1,840"
        valueClassName={styles.green}
      />
      <MetricRow label="eng time / wk" value="31 hrs" />
      <Status kind="live">
        measured vs cold-start baselines · session #a4f2
      </Status>
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

function Status({
  children,
  kind = "ok",
}: {
  children: ReactNode
  kind?: "live" | "ok"
}) {
  return (
    <div className={styles.statusLine}>
      <span
        className={cn(
          kind === "live" ? styles.statusGlyphLive : styles.statusGlyphOk,
        )}
      >
        {kind === "live" ? "→" : "✓"}
      </span>
      <span>{children}</span>
    </div>
  )
}

function SessionGroup({ count, name }: { count: string; name: string }) {
  return (
    <div className={styles.sessionGroup}>
      <span>{name}</span>
      <span>{count}</span>
    </div>
  )
}

function SessionRow({
  accent = "green",
  name,
  state,
  tool,
}: {
  accent?: "amber" | "green"
  name: string
  state: string
  tool: string
}) {
  return (
    <div className={styles.sessionRow}>
      <span
        className={cn(
          styles.statusDot,
          accent === "amber" ? styles.amberDot : styles.greenDot,
        )}
      />
      <span className={styles.sessionName}>{name}</span>
      <span className={styles.sessionTool}>{tool}</span>
      <span className={styles.sessionState}>{state}</span>
    </div>
  )
}

function LedgerRow({
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
    <div className={styles.ledgerRow}>
      <span className={styles.ledgerTime}>{time}</span>
      <span className={styles.ledgerSession}>{session}</span>
      <span className={styles.ledgerActivity}>{activity}</span>
      <span className={styles.ledgerRef}>{refName}</span>
    </div>
  )
}

function MetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span aria-hidden className={styles.metricDots} />
      <span className={cn(styles.metricValue, valueClassName)}>{value}</span>
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
