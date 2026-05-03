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
                  {isPublic
                    ? "Operational memory for AI automation"
                    : `Welcome back, ${displayName}`}
                </p>
                <h1 className={styles.heroTitle}>
                  EnderAI turns scattered company knowledge into executable
                  context.
                </h1>
                <p className={styles.heroDescription}>
                  Every company runs on domain knowledge spread across people,
                  tickets, code, docs, Slack, support history, databases, and
                  past decisions. EnderAI captures that raw context, organizes
                  it into a living map of how the business works, and turns it
                  into workflows humans and AI agents can use safely.
                </p>
              </div>
              <div className={styles.heroActions}>
                {isPublic ? (
                  <>
                    <Button asChild size="lg" className={styles.primaryCta}>
                      <RouterLink to={signedIn ? "/home" : "/signup"}>
                        <Sparkles className={styles.icon} />
                        Build operational memory
                      </RouterLink>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      {signedIn ? (
                        <RouterLink to="/home">
                          <LogIn className={styles.icon} />
                          Open Home
                        </RouterLink>
                      ) : (
                        <a href="#sensitive-data-example">
                          <ArrowRight className={styles.icon} />
                          See how it works
                        </a>
                      )}
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
              <p className={styles.sectionEyebrow}>Why it matters</p>
              <h2 className={styles.sectionTitle}>
                The bottleneck is company context
              </h2>
            </div>
            <p className={styles.sectionDescription}>
              AI models can do real work, but agents still need the
              company-specific context required to act correctly. EnderAI fills
              the missing layer between raw company data and reliable
              automation.
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
              <p className={styles.sectionEyebrow}>How it works</p>
              <h2 className={styles.sectionTitle}>
                Company knowledge becomes structured and actionable
              </h2>
            </div>
            <p className={styles.sectionDescription}>
              EnderAI is not search and not a chatbot over docs. It is the
              operational memory layer that makes domain knowledge current,
              structured, and executable.
            </p>
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

        <section
          className={styles.agentExampleSection}
          id="sensitive-data-example"
        >
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Engineering example</p>
              <h2 className={styles.sectionTitle}>
                Example: sensitive data correction
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
                    "A customer's sensitive profile field was imported
                    incorrectly. Please correct it, prove downstream systems are
                    clean, and leave an audit trail."
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
                    "I found the customer record, source-of-truth policy,
                    approval path, replica systems, validation checklist, and
                    prior correction cases. I will draft the correction steps,
                    preserve an audit trail, and produce the reusable workflow
                    for the next similar request."
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
    title: "Capture raw context",
    description:
      "Tickets, docs, code, commands, conversations, approvals, and outcomes are preserved.",
  },
  {
    step: "02",
    title: "Structure the domain",
    description:
      "EnderAI organizes the work into entities, systems, policies, risks, and workflows.",
  },
  {
    step: "03",
    title: "Hydrate the next task",
    description:
      "Relevant prior context is packaged before a human or AI agent starts work.",
  },
  {
    step: "04",
    title: "Make it executable",
    description:
      "The result becomes checklists, audit trails, handoffs, tests, and agent instructions.",
  },
]

const signalPills = [
  "tickets",
  "docs",
  "code",
  "policies",
  "customers",
  "decisions",
]

const marketingTiles: MarketingTileProps[] = [
  {
    icon: Database,
    title: "Capture raw context",
    description:
      "Pull in the tickets, docs, code changes, commands, conversations, approvals, customer history, incidents, and decisions behind how work happens.",
  },
  {
    icon: GitBranch,
    title: "Structure the domain",
    description:
      "Organize company knowledge into Topics, Cases, entities, systems, policies, risks, and edge cases so it becomes a living map.",
  },
  {
    icon: RefreshCcw,
    title: "Make it executable",
    description:
      "Turn that map into checklists, audit trails, handoffs, agent briefings, tests, and reusable workflow instructions.",
  },
]

const modelCards: ModelCardProps[] = [
  {
    icon: Box,
    label: "User-facing",
    title: "Topics",
    description:
      "Topics are durable areas of company knowledge that should be reused across related work.",
    details: [
      "Useful for products, systems, policies, customers, incidents, and operational areas.",
      "Holds aliases, status, summaries, files, symbols, risks, and decisions.",
      "Gives future Cases a stable place to inherit domain context.",
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
      "Cases are individual executions of work under a Topic, usually one request or task.",
    details: [
      "Tracks input, raw context, commands, hypotheses, changes, approvals, and outcome.",
      "Keeps validation evidence and next steps visible when work pauses or continues later.",
      "Provides the concrete history future humans and agents can reuse.",
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
      "Context Packs are the synthesized briefings EnderAI builds before a human or agent starts work.",
    details: [
      "Select relevant prior Topics, Cases, policies, systems, and decisions.",
      "Include matched signals, pinned takeaways, ambiguity notes, risks, and confidence.",
      "Give agents the domain context needed to act safely and consistently.",
    ],
  },
]

const mockEnderAiCall = `enderai_begin_case({
  request_summary:
    "Correct an incorrectly imported sensitive customer field",
  signals: {
    product_area: "Customer data",
    entities: [
      "Customer profile",
      "Sensitive profile field"
    ],
    requirements: [
      "Confirm source of truth",
      "Validate downstream replicas",
      "Preserve audit trail"
    ]
  }
})`

const mockContextPack = [
  {
    label: "Topic",
    value: "Sensitive customer data corrections",
  },
  {
    label: "Prior Case",
    value: "Corrected imported profile data after vendor mapping issue",
  },
  {
    label: "Matched Signals",
    value:
      "Customer profile, source of truth, replica systems, compliance approval",
  },
  {
    label: "Policy Cue",
    value:
      "Security approval is required before modifying sensitive customer fields.",
  },
  {
    label: "Validation Cue",
    value:
      "Check primary storage, analytics replica, support view, and audit log.",
  },
]
