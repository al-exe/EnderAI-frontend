import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, FileText, Users } from "lucide-react"

import { useDemoMode } from "@/components/demo-mode-provider"
import { Badge } from "@/components/ui/badge"
import { TaskforcePlaceholder } from "@/components/V2/TaskforceShell"

export const Route = createFileRoute("/v2/library")({
  component: TaskforceLibrary,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Library",
      },
    ],
  }),
})

function TaskforceLibrary() {
  const { isDemoMode } = useDemoMode()

  if (!isDemoMode) {
    return (
      <TaskforcePlaceholder
        eyebrow="Taskforce"
        title="Library"
        description="Turn on demo mode to preview V2 document examples."
      />
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="shrink-0 border-l border-border pl-5">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
          Taskforce
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Library</h1>
          <Badge variant="secondary">Demo mode</Badge>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          V2 document examples showing a human summary backed by AI-friendly
          detail evidence.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {demoDocuments.map((document) => (
          <article
            key={document.title}
            className="flex min-h-[320px] flex-col border bg-card p-5 text-card-foreground"
          >
            <div className="flex items-start justify-between gap-3">
              <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <Badge variant="outline">{document.status}</Badge>
            </div>

            <div className="mt-4">
              <h2 className="text-base font-semibold leading-6">
                {document.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {document.description}
              </p>
            </div>

            <dl className="mt-5 grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                <dt className="sr-only">Updated</dt>
                <dd>
                  Created {document.createdAt} - Updated {document.updatedAt}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <dt className="sr-only">Collaborators</dt>
                <dd>{document.collaborators.join(", ")}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Human summary
              </p>
              <p className="mt-2 text-sm leading-6">{document.humanSummary}</p>
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                AI detail seed
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                {document.aiDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const demoDocuments = [
  {
    title: "Latest Stale Network Bridge Issue",
    description:
      "Customer-impact investigation with a verified operator fix and command evidence.",
    createdAt: "May 10",
    updatedAt: "May 12",
    collaborators: ["Alex Lee", "Nia Patel"],
    status: "Resolved",
    humanSummary:
      "XYZ Corp users hit stale bridge routing after a deploy; the validated fix is Alex's bridge refresh script.",
    aiDetails: [
      "Files: infra/network/bridge-refresh.sh, ops/runbooks/network-bridge.md",
      "Commands: kubectl logs deploy/bridge-controller, ./bridge-refresh.sh --tenant xyz",
      "Evidence anchors: affected tenant logs, script diff, post-refresh health check",
    ],
  },
  {
    title: "V2 Document Evidence Contract",
    description:
      "Design note for human-summary claims backed by AI-friendly source anchors.",
    createdAt: "May 13",
    updatedAt: "May 14",
    collaborators: ["Alex Lee", "Jordan Kim"],
    status: "Draft",
    humanSummary:
      "Human summaries should stay short, but each claim needs a direct path to detailed evidence.",
    aiDetails: [
      "Files: docs/topic-case-contextpack-model.md, src/routes/v2/library.tsx",
      'Commands: rg "ContextPack", npm run build',
      "Evidence anchors: claim model sketch, same-document detail links, cross-document choices",
    ],
  },
  {
    title: "Hosted MCP Credential Setup Refresh",
    description:
      "Setup guidance for connecting an AI client with file-backed token persistence.",
    createdAt: "May 15",
    updatedAt: "May 17",
    collaborators: ["Alex Lee"],
    status: "Ready",
    humanSummary:
      "Fresh terminals prevent stale MCP credentials from persisting after token creation or rotation.",
    aiDetails: [
      "Files: src/components/UserSettings/ConnectAgent.tsx, docs/hosted-mcp-onboarding.md",
      "Commands: npm run build, playwright targeted setup spec",
      "Evidence anchors: token file snippet, reconnect instruction, V2 document instruction set",
    ],
  },
]
