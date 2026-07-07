import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"

import { readMyOrganization, updateMyOrganization } from "@/api/organizations"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"

export const organizationQueryKey = ["my-organization"]

export function AutoEvolveToggle({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const organizationQuery = useQuery({
    queryKey: organizationQueryKey,
    queryFn: readMyOrganization,
  })

  const autoEvolveMutation = useMutation({
    mutationFn: (autoEvolveEnabled: boolean) =>
      updateMyOrganization({ auto_evolve_enabled: autoEvolveEnabled }),
    onSuccess: (updatedOrganization) => {
      showSuccessToast(
        updatedOrganization.auto_evolve_enabled
          ? "Auto-evolve enabled"
          : "Auto-evolve disabled — humans-only mode",
      )
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    },
    onError: () => {
      showErrorToast("Could not update auto-evolve setting.")
    },
  })

  const organization = organizationQuery.data
  const isAdmin = organization?.organization_role === "admin"

  if (!isAdmin || organizationQuery.isLoading || !organization) {
    return null
  }

  const enabled = organization.auto_evolve_enabled

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1 pl-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <span className="whitespace-nowrap font-medium text-foreground">
          Auto-evolve
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant={enabled ? "default" : "outline"}
        className="h-7 min-w-12 px-2.5"
        data-testid="profiles-auto-evolve-toggle"
        disabled={autoEvolveMutation.isPending}
        onClick={() => autoEvolveMutation.mutate(!enabled)}
      >
        {enabled ? "On" : "Off"}
      </Button>
    </div>
  )
}
