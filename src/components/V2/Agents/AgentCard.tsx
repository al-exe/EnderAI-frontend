import { Link } from "@tanstack/react-router"
import { ArrowRight, BookOpen, Clock3, Sparkles } from "lucide-react"

import type { AgentSpecialistSummary } from "@/api/v2Agents"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCompactNumber, formatRelativeTime } from "./formatters"

type Props = {
  agent: AgentSpecialistSummary
}

export function AgentCard({ agent }: Props) {
  return (
    <Card className="group relative overflow-hidden border-border/80 bg-background/95 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-500 opacity-80" />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <CardTitle className="text-2xl">{agent.name}</CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {agent.role}
            </p>
          </div>
          <Badge variant="outline">{agent.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="min-h-12 text-sm leading-6 text-muted-foreground">
          {agent.short_description}
        </p>
        <div className="flex flex-wrap gap-2">
          {agent.domain_tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="normal-case">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/50 p-3 text-sm">
          <div>
            <div className="font-semibold tabular-nums">
              {formatCompactNumber(agent.tokens_saved)}
            </div>
            <div className="text-xs text-muted-foreground">saved</div>
          </div>
          <div>
            <div className="font-semibold tabular-nums">
              {agent.invocations_count}
            </div>
            <div className="text-xs text-muted-foreground">runs</div>
          </div>
          <div>
            <div className="font-semibold tabular-nums">
              {agent.linked_docs_count}
            </div>
            <div className="text-xs text-muted-foreground">docs</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {agent.last_invoked_at ? (
              <Clock3 className="size-3.5" />
            ) : (
              <BookOpen className="size-3.5" />
            )}
            <span>{formatRelativeTime(agent.last_invoked_at)}</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/v2/agents/$slug" params={{ slug: agent.slug }}>
              View specialist
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
