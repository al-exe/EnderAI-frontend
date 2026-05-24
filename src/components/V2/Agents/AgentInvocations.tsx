import { Link } from "@tanstack/react-router"
import { BarChart3, GitBranch } from "lucide-react"

import type { AgentSpecialistInvocationSummary } from "@/api/v2Agents"
import { formatCompactNumber, formatRelativeTime } from "./formatters"

type Props = {
  invocations: AgentSpecialistInvocationSummary[]
}

export function AgentInvocations({ invocations }: Props) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Recent invocations</h2>
      <div className="mt-5 overflow-hidden rounded-2xl border">
        {invocations.map((invocation) => {
          const row = (
            <div
              key={`${invocation.id}-row`}
              className="grid gap-2 border-b p-4 last:border-b-0 hover:bg-muted/40 md:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-medium">{invocation.prompt}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(invocation.created_at)}</span>
                  {invocation.branch && (
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3" />
                      {invocation.branch}
                    </span>
                  )}
                  <span>{invocation.documents_consulted_count} docs</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium tabular-nums">
                <BarChart3 className="size-4 text-primary" />
                {formatCompactNumber(invocation.tokens_saved)} saved
              </div>
            </div>
          )

          return invocation.session_id ? (
            <Link
              key={invocation.id}
              to="/v2/metrics"
              search={{ session_id: invocation.session_id }}
              className="block"
            >
              {row}
            </Link>
          ) : (
            <div key={invocation.id}>{row}</div>
          )
        })}
        {invocations.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            No invocation history yet.
          </p>
        )}
      </div>
    </section>
  )
}
