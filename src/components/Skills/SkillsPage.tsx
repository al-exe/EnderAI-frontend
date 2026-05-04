import { useQuery } from "@tanstack/react-query"
import {
  BookOpenCheck,
  Boxes,
  Copy,
  FileCode2,
  Search,
  Sparkles,
} from "lucide-react"
import { useEffect, useState } from "react"

import { readSkills, type SkillPublic } from "@/api/skills"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"
import styles from "./SkillsPage.module.css"

function formatTimestamp(value: string | null): string {
  if (!value) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function badgeVariant(
  value: string,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  const normalized = value.trim().toLowerCase()
  if (normalized === "high" || normalized === "published") return "success"
  if (normalized === "medium" || normalized === "draft") return "secondary"
  if (normalized === "archived" || normalized === "low") return "outline"
  return "default"
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function getSourceTopic(skill: SkillPublic): {
  title: string | null
  summary: string | null
} {
  const topic = asRecord(skill.source_snapshot.topic)
  return {
    title: stringValue(topic.title),
    summary: stringValue(topic.summary),
  }
}

function sourceLabel(skill: SkillPublic): string {
  const topic = getSourceTopic(skill)
  if (topic.title) return topic.title
  if (skill.source_type === "context_pack") return "ContextPack"
  if (skill.source_type === "case") return "Case"
  return "Topic"
}

function sourceTypeLabel(sourceType: string): string {
  return sourceType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function SignalList({
  title,
  items,
  emptyText,
}: {
  title: string
  items: string[]
  emptyText: string
}) {
  return (
    <div className={styles.signalGroup}>
      <div className={styles.signalTitle}>{title}</div>
      {items.length > 0 ? (
        <div className={styles.chipList}>
          {items.map((item, index) => (
            <Badge
              key={`${title}-${item}-${index}`}
              variant="outline"
              className={styles.chip}
              title={item}
            >
              <span className={styles.chipLabel}>{item}</span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className={styles.smallMutedText}>{emptyText}</p>
      )}
    </div>
  )
}

function SkillCard({
  skill,
  isSelected,
  onSelect,
}: {
  skill: SkillPublic
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(styles.skillCard, isSelected && styles.skillCardSelected)}
      onClick={onSelect}
    >
      <div className={styles.skillCardHeader}>
        <div className={styles.skillCardTitle}>{skill.title}</div>
        <Badge variant={badgeVariant(skill.confidence)}>
          {skill.confidence}
        </Badge>
      </div>
      <p className={styles.skillCardDescription}>
        {skill.description ?? `Generated from ${sourceLabel(skill)}.`}
      </p>
      <div className={styles.skillCardMeta}>
        <Badge variant="outline">{sourceTypeLabel(skill.source_type)}</Badge>
        <span>{skill.source_case_ids.length} source cases</span>
        <span>Used {skill.usage_count} times</span>
      </div>
    </button>
  )
}

function SkillDetail({ skill }: { skill: SkillPublic | null }) {
  const [copiedText, copy] = useCopyToClipboard()

  if (!skill) {
    return (
      <Card className={styles.detailCard}>
        <CardContent className={styles.emptyState}>
          <Sparkles className={styles.emptyIcon} />
          <div>
            <h3 className={styles.emptyTitle}>Select a generated skill</h3>
            <p className={styles.smallMutedText}>
              Draft instructions generated from captured work.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const topic = getSourceTopic(skill)
  const pinnedTakeaways = stringList(skill.source_snapshot.pinned_takeaways)
  const openQuestions = stringList(skill.source_snapshot.open_questions)
  const negativeHistory = stringList(skill.source_snapshot.negative_history)

  return (
    <Card className={styles.detailCard}>
      <CardHeader className={styles.detailHeader}>
        <div className={styles.detailHeaderMain}>
          <div className={styles.badgeRow}>
            <Badge variant={badgeVariant(skill.status)}>{skill.status}</Badge>
            <Badge variant={badgeVariant(skill.confidence)}>
              {skill.confidence} confidence
            </Badge>
            {skill.is_demo ? <Badge variant="secondary">Demo</Badge> : null}
          </div>
          <CardTitle className={styles.detailTitle}>{skill.title}</CardTitle>
          <CardDescription>
            {skill.description ?? `Generated from ${sourceLabel(skill)}.`}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void copy(skill.instructions_md)
          }}
        >
          <Copy className={styles.icon} />
          {copiedText === skill.instructions_md ? "Copied" : "Copy skill"}
        </Button>
      </CardHeader>
      <CardContent className={styles.detailContent}>
        <section className={styles.section}>
          <div className={styles.sectionHeading}>Source</div>
          <div className={styles.sourceGrid}>
            <div>
              <span className={styles.sourceLabel}>Type</span>
              <p>{sourceTypeLabel(skill.source_type)}</p>
            </div>
            <div>
              <span className={styles.sourceLabel}>Topic</span>
              <p>{topic.title ?? skill.source_topic_id ?? "Unknown"}</p>
            </div>
            <div>
              <span className={styles.sourceLabel}>Last updated</span>
              <p>{formatTimestamp(skill.updated_at)}</p>
            </div>
          </div>
          {topic.summary ? (
            <p className={styles.sourceSummary}>{topic.summary}</p>
          ) : null}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <Search className={styles.sectionIcon} />
            Match Signals
          </div>
          <div className={styles.signalGrid}>
            <SignalList
              title="Triggers"
              items={skill.trigger_phrases}
              emptyText="No trigger phrases captured."
            />
            <SignalList
              title="Files"
              items={skill.files}
              emptyText="No canonical files captured."
            />
            <SignalList
              title="Symbols"
              items={skill.symbols}
              emptyText="No canonical symbols captured."
            />
            <SignalList
              title="Errors"
              items={skill.errors}
              emptyText="No canonical errors captured."
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <BookOpenCheck className={styles.sectionIcon} />
            Reusable Notes
          </div>
          <div className={styles.notesGrid}>
            <SignalList
              title="Pinned takeaways"
              items={pinnedTakeaways}
              emptyText="No takeaways promoted yet."
            />
            <SignalList
              title="Open questions"
              items={openQuestions}
              emptyText="No open questions captured."
            />
            <SignalList
              title="Negative history"
              items={negativeHistory}
              emptyText="No negative history captured."
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <FileCode2 className={styles.sectionIcon} />
            Skill Instructions
          </div>
          <pre className={styles.instructionsPre}>
            <code>{skill.instructions_md}</code>
          </pre>
        </section>
      </CardContent>
    </Card>
  )
}

export function SkillsPage({
  initialSelectedSkillId = null,
}: {
  initialSelectedSkillId?: string | null
}) {
  const { isDemoMode } = useDemoMode()
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(
    initialSelectedSkillId,
  )

  const skillsQuery = useQuery({
    queryKey: ["skills", { demo: isDemoMode }],
    queryFn: () => readSkills({ demo: isDemoMode, limit: 100 }),
  })

  const skills = skillsQuery.data?.data ?? []
  const selectedSkill =
    (selectedSkillId
      ? skills.find((skill) => skill.id === selectedSkillId)
      : skills[0]) ?? null

  useEffect(() => {
    setSelectedSkillId(initialSelectedSkillId)
  }, [initialSelectedSkillId])

  useEffect(() => {
    if (skillsQuery.isLoading) return

    if (skills.length === 0) {
      setSelectedSkillId(null)
      return
    }

    if (
      selectedSkillId &&
      skills.some((skill) => skill.id === selectedSkillId)
    ) {
      return
    }

    setSelectedSkillId(skills[0].id)
  }, [selectedSkillId, skills, skillsQuery.isLoading])

  return (
    <div className={styles.page}>
      {skillsQuery.error ? (
        <Card>
          <CardContent className={styles.errorContent}>
            Couldn&apos;t load skills. Check the backend endpoint.
          </CardContent>
        </Card>
      ) : null}

      <div className={styles.layout}>
        <Card className={styles.listCard}>
          <CardHeader>
            <CardTitle className={styles.listTitle}>
              <Boxes className={styles.icon} />
              Skill Library
            </CardTitle>
          </CardHeader>
          <CardContent className={styles.listContent}>
            {skillsQuery.isLoading ? (
              <p className={styles.smallMutedText}>Loading skills...</p>
            ) : skills.length === 0 ? (
              <div className={styles.emptyList}>
                <Sparkles className={styles.emptyIcon} />
                <p>No generated skills yet.</p>
                <span>
                  Turn on demo mode or generate one from a Topic or Case.
                </span>
              </div>
            ) : (
              <div className={styles.skillList}>
                {skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    isSelected={skill.id === selectedSkill?.id}
                    onSelect={() => setSelectedSkillId(skill.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <SkillDetail skill={selectedSkill} />
      </div>
    </div>
  )
}
