import { CheckCircle2 } from "lucide-react"

type Props = {
  instructions: string[]
}

export function AgentInstructions({ instructions }: Props) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Operating instructions</h2>
      <div className="mt-5 space-y-3">
        {instructions.map((instruction) => (
          <div key={instruction} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <p className="text-sm leading-6 text-muted-foreground">
              {instruction}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
