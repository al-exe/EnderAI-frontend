import { Link as RouterLink } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SearchUpsell() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5" /> Search is a paid feature
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>
          Ask anything about the work you've captured in Taskforce and get cited
          answers grounded in your own documents. Available on Pro
          (bring-your-own-key) and Max (we cover the LLM cost).
        </p>
        <div>
          <Button asChild>
            <RouterLink to="/v2/pricing">View plans</RouterLink>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
