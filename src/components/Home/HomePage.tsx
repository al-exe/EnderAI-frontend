import { Link as RouterLink } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Box,
  Boxes,
  CheckCircle2,
  Database,
  GitBranch,
  LogIn,
  RefreshCcw,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react"

import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import styles from "./HomePage.module.css"

type HomePageProps = {
  mode: "app" | "public"
  signedIn?: boolean
  user?: UserPublic | null
}

export function HomePage({ mode, signedIn = false, user }: HomePageProps) {
  const isPublic = mode === "public"
  const canUseApp = !isPublic || signedIn
  const firstName = user?.full_name?.trim().split(/\s+/)[0]
  const displayName = firstName || user?.email || "there"

  return (
    <div className={cn(styles.page, isPublic && styles.publicPage)}>
      {isPublic ? <PublicNav signedIn={signedIn} /> : null}

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.heroText}>
                <p className={styles.greeting}>
                  {isPublic ? "EnderAI" : `Welcome back, ${displayName}`}
                </p>
                <h1 className={styles.heroTitle}>
                  EnderAI is product memory for AI-assisted work.
                </h1>
                <p className={styles.heroDescription}>
                  It gives agents a shared place to remember work done, commands
                  run, decisions made, and outcomes reached so each new task can
                  start with relevant context instead of rediscovery.
                </p>
              </div>
              <div className={styles.heroActions}>
                {isPublic ? (
                  <>
                    <Button asChild size="lg" className={styles.primaryCta}>
                      <RouterLink to={signedIn ? "/home" : "/signup"}>
                        <Sparkles className={styles.icon} />
                        Use EnderAI now
                      </RouterLink>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <RouterLink to={signedIn ? "/home" : "/login"}>
                        <LogIn className={styles.icon} />
                        {signedIn ? "Open Home" : "Log in now"}
                      </RouterLink>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" size="lg">
                      <RouterLink to="/topics">
                        Open Topics
                        <ArrowRight className={styles.icon} />
                      </RouterLink>
                    </Button>
                    <Button asChild size="lg">
                      <RouterLink
                        to="/settings"
                        search={{ tab: "connect-agent" }}
                        data-testid="home-connect-agent-link"
                      >
                        Connect agent
                      </RouterLink>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <HeroGraphic />
          </div>
        </section>

        <section className={styles.marketingSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Why it helps</p>
              <h2 className={styles.sectionTitle}>Agents start with memory</h2>
            </div>
          </div>

          <div className={styles.marketingGrid}>
            {marketingTiles.map((tile) => (
              <MarketingTile key={tile.title} {...tile} />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>What to use</p>
              <h2 className={styles.sectionTitle}>The product model</h2>
            </div>
          </div>

          <div className={styles.modelGrid}>
            {modelCards.map((card) => (
              <ModelCard
                key={card.title}
                {...card}
                action={getModelAction(card.action, canUseApp)}
              />
            ))}
          </div>
        </section>

        <section className={styles.agentExampleSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Engineering example</p>
              <h2 className={styles.sectionTitle}>
                A task starts with remembered context
              </h2>
            </div>
          </div>

          <div className={styles.exampleFrame}>
            <div className={styles.exampleGrid}>
              <div className={styles.exampleColumn}>
                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>
                    <Sparkles className={styles.exampleLabelIcon} />
                    User request
                  </div>
                  <p className={styles.exampleQuote}>
                    "The deployment dashboard stopped showing release status
                    after yesterday's refactor. Can you patch it?"
                  </p>
                </div>

                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>
                    <Terminal className={styles.exampleLabelIcon} />
                    EnderAI Call
                  </div>
                  <pre className={styles.exampleCode}>
                    <code>{mockEnderAiCall}</code>
                  </pre>
                </div>
              </div>

              <div className={styles.exampleColumn}>
                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>
                    <Database className={styles.exampleLabelIcon} />
                    EnderAI returns
                  </div>
                  <dl className={styles.contextRows}>
                    {mockContextPack.map((item) => (
                      <div className={styles.contextRow} key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div
                  className={cn(styles.exampleBlock, styles.exampleReplyBlock)}
                >
                  <div className={styles.exampleLabel}>
                    <ArrowRight className={styles.exampleLabelIcon} />
                    Agent continues
                  </div>
                  <p className={styles.exampleQuote}>
                    "I found the prior dashboard refactor and the release-status
                    decision. I will inspect the deployment summary rendering
                    first, preserve the cached status fallback, then update the
                    regression test around active releases."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function PublicNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className={styles.publicNav}>
      <RouterLink to="/" className={styles.brandLink}>
        EnderAI
      </RouterLink>
      <nav className={styles.publicNavActions} aria-label="Public navigation">
        <Button asChild variant="ghost">
          <RouterLink to={signedIn ? "/home" : "/login"}>
            {signedIn ? "Open Home" : "Log in"}
          </RouterLink>
        </Button>
        <Button asChild>
          <RouterLink to={signedIn ? "/home" : "/signup"}>
            {signedIn ? "Use now" : "Sign up"}
          </RouterLink>
        </Button>
      </nav>
    </header>
  )
}

function HeroGraphic() {
  return (
    <div className={styles.heroGraphic}>
      <div className={styles.graphicHeader}>
        <Badge variant="outline" className={styles.connectBadge}>
          <Zap className={styles.badgeIcon} />
          Live context
        </Badge>
        <span className={styles.graphicStatus}>Ready for the next task</span>
      </div>
      <div className={styles.memoryFlow}>
        {workflowSteps.map((step) => (
          <div className={styles.flowItem} key={step.title}>
            <span className={styles.flowNumber}>{step.step}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.signalBoard}>
        {signalPills.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </div>
    </div>
  )
}

type MarketingTileProps = {
  icon: LucideIcon
  title: string
  description: string
}

function MarketingTile({ icon: Icon, title, description }: MarketingTileProps) {
  return (
    <div className={styles.marketingTile}>
      <div className={styles.marketingIconWrap}>
        <Icon className={styles.marketingIcon} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

type ModelAction = {
  label: string
  to: "/topics" | "/cases" | "/login"
}

type ModelCardProps = {
  icon: LucideIcon
  label: string
  title: string
  description: string
  details: string[]
  action?: ModelAction
}

function ModelCard({
  icon: Icon,
  label,
  title,
  description,
  details,
  action,
}: ModelCardProps) {
  return (
    <Card className={styles.modelCard}>
      <CardHeader>
        <div className={styles.modelCardTop}>
          <div className={styles.cardIconWrap}>
            <Icon className={styles.cardIcon} />
          </div>
          <Badge variant="outline">{label}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={styles.modelCardContent}>
        <ul className={styles.detailList}>
          {details.map((detail) => (
            <li key={detail}>
              <CheckCircle2 className={styles.checkIcon} />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
        {action ? (
          <Button asChild variant="outline">
            <RouterLink to={action.to}>
              {action.label}
              <ArrowRight className={styles.icon} />
            </RouterLink>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

const getModelAction = (
  action: ModelAction | undefined,
  canUseApp: boolean,
): ModelAction | undefined => {
  if (!action) return undefined

  if (canUseApp) return action

  return {
    label:
      action.to === "/topics"
        ? "Log in to browse Topics"
        : "Log in to review Cases",
    to: "/login",
  }
}

const workflowSteps = [
  {
    step: "01",
    title: "Begin a Case",
    description: "The agent starts meaningful work by starting a Case.",
  },
  {
    step: "02",
    title: "Hydrate context",
    description: "EnderAI finds relevant prior Topics and Cases automatically.",
  },
  {
    step: "03",
    title: "Capture progress",
    description:
      "Updates, commands, files, and decisions are written as work develops.",
  },
  {
    step: "04",
    title: "Close the loop",
    description: "The agent finishes the Case with outcome and next steps.",
  },
]

const signalPills = ["commands", "files", "decisions", "symptoms", "next steps"]

const marketingTiles: MarketingTileProps[] = [
  {
    icon: Database,
    title: "Context that sticks",
    description: "Keep summaries, files, errors, and decisions reusable.",
  },
  {
    icon: GitBranch,
    title: "Workstreams stay clear",
    description: "Group repeated requests under durable Topics.",
  },
  {
    icon: RefreshCcw,
    title: "Handoffs get shorter",
    description: "Give the next agent the briefing it needs up front.",
  },
]

const modelCards: ModelCardProps[] = [
  {
    icon: Box,
    label: "User-facing",
    title: "Topics",
    description:
      "A Topic is a durable area of work that should be reused across related sessions.",
    details: [
      "Best for subsystems, features, recurring bugs, and operational areas.",
      "Holds aliases, status, summaries, files, symbols, errors, and symptoms.",
      "Gives future Cases a stable place to attach context.",
    ],
    action: {
      label: "Browse Topics",
      to: "/topics",
    },
  },
  {
    icon: Boxes,
    label: "User-facing",
    title: "Cases",
    description:
      "A Case is one bounded work session under a Topic, usually one request or task.",
    details: [
      "Tracks input, current summary, commands, hypotheses, changes, and outcome.",
      "Keeps next steps visible when work pauses or continues later.",
      "Provides the history that future agents can reuse.",
    ],
    action: {
      label: "Review Cases",
      to: "/cases",
    },
  },
  {
    icon: Shield,
    label: "System-powered",
    title: "Context Packs",
    description:
      "A Context Pack is the synthesized briefing EnderAI builds for an agent at Case start.",
    details: [
      "Selects relevant prior Topics and Cases.",
      "Includes matched signals, pinned takeaways, ambiguity notes, and confidence.",
      "Visible in Case detail and Topic context intelligence without becoming separate navigation.",
    ],
  },
]

const mockEnderAiCall = `enderai_begin_case({
  request_summary:
    "Patch missing release status on the deployment dashboard",
  signals: {
    product_area: "Deployments",
    components: [
      "Dashboard summary",
      "Release status card"
    ],
    symptoms: [
      "Active releases no longer show their current status"
    ]
  }
})`

const mockContextPack = [
  {
    label: "Topic",
    value: "Deployment dashboard reliability",
  },
  {
    label: "Prior Case",
    value: "Refactored release cards to share one status formatter",
  },
  {
    label: "Matched Signals",
    value: "Deployments, release status, dashboard summary, active releases",
  },
  {
    label: "Remembered Decision",
    value:
      "Keep the cached status fallback when live release metadata is delayed.",
  },
  {
    label: "Test Cue",
    value:
      "Regression coverage should include active, failed, and pending releases.",
  },
]
