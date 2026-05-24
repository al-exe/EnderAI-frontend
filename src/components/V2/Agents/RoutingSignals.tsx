import { Badge } from "@/components/ui/badge"

type Props = {
  routingTriggers: string[]
  negativeTriggers: string[]
}

export function RoutingSignals({ routingTriggers, negativeTriggers }: Props) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Routing signals</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Send here when the ask includes
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {routingTriggers.map((trigger) => (
              <Badge key={trigger} className="normal-case">
                {trigger}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Avoid routing for
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {negativeTriggers.map((trigger) => (
              <Badge key={trigger} variant="outline" className="normal-case">
                {trigger}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
