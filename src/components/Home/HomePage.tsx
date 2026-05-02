import { Link as RouterLink } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Box,
  Boxes,
  CheckCircle2,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  LogIn,
  RefreshCcw,
  Settings,
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
              <h2 className={styles.sectionTitle}>Agents start with memory.</h2>
            </div>
            <p className={styles.sectionDescription}>
              Keep useful context attached to the product work it came from.
            </p>
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

        <section className={styles.connectSection}>
          <div className={styles.connectCopy}>
            <Badge variant="outline" className={styles.connectBadge}>
              <Terminal className={styles.badgeIcon} />
              MCP setup
            </Badge>
            <h2 className={styles.sectionTitle}>Connect your agent</h2>
            <p className={styles.sectionDescription}>
              Open Settings, create an MCP credential, add the generated config
              to your client, then ask the agent to verify the connection with{" "}
              <code className={styles.inlineCode}>enderai_session_info</code>.
            </p>
            <div className={styles.connectActions}>
              <Button asChild>
                {canUseApp ? (
                  <RouterLink to="/settings" search={{ tab: "connect-agent" }}>
                    Open Connect Agent
                    <ArrowRight className={styles.icon} />
                  </RouterLink>
                ) : (
                  <RouterLink to="/login">
                    Log in to connect agent
                    <ArrowRight className={styles.icon} />
                  </RouterLink>
                )}
              </Button>
            </div>
          </div>

          <div className={styles.setupSteps}>
            {connectionSteps.map((step) => (
              <div className={styles.setupStep} key={step.title}>
                <step.icon className={styles.setupIcon} />
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.workflowSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Agent instruction</p>
              <h2 className={styles.sectionTitle}>
                The minimum workflow your agent should follow
              </h2>
            </div>
          </div>

          <div className={styles.commandPanel}>
            <pre>
              <code>{agentInstructionSnippet}</code>
            </pre>
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

const connectionSteps: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: Settings,
    title: "Open Settings > Connect agent",
    description:
      "Generate or rotate the one MCP token your hosted EnderAI client needs.",
  },
  {
    icon: KeyRound,
    title: "Install the generated snippets",
    description:
      "Use the export command and generated MCP config block for your AI client.",
  },
  {
    icon: FileText,
    title: "Add the workflow instruction",
    description:
      "Tell the agent to begin, update, and finish Cases with EnderAI tools.",
  },
]

const agentInstructionSnippet = [
  "If EnderAI tools are available:",
  "- Start meaningful user-initiated work with `enderai_begin_case`.",
  "- Let EnderAI auto-hydrate relevant prior context before work begins.",
  "- Use `enderai_update_case` as material progress develops.",
  "- Use `enderai_finish_case` when the work is complete.",
  "- Prefer the guided case tools over raw `enderai_request` calls.",
].join("\n")
