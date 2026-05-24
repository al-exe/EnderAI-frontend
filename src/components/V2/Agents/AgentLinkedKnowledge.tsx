import { ArrowUpRight, FileText } from "lucide-react"

import type { AgentSpecialistLinkedDoc } from "@/api/v2Agents"

type Props = {
  documents: AgentSpecialistLinkedDoc[]
}

export function AgentLinkedKnowledge({ documents }: Props) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Linked knowledge</h2>
      <div className="mt-5 grid gap-3">
        {documents.map((document) => (
          <a
            key={`${document.document_id}-${document.anchor_id ?? "summary"}`}
            href={document.href}
            className="group rounded-2xl border bg-muted/30 p-4 transition hover:border-primary/40 hover:bg-muted/60"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-background p-2 text-primary">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{document.title}</h3>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {document.description}
                </p>
                {document.reason && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    {document.reason}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
        {documents.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            No linked knowledge yet.
          </p>
        )}
      </div>
    </section>
  )
}
