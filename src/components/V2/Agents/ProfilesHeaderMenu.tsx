import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal } from "lucide-react"

import { readMyOrganization, updateMyOrganization } from "@/api/organizations"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"

export const organizationQueryKey = ["my-organization"]

export function ProfilesHeaderMenu() {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Profiles options"
          data-testid="profiles-page-menu-trigger"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuCheckboxItem
          checked={enabled}
          disabled={autoEvolveMutation.isPending}
          data-testid="profiles-auto-evolve-toggle"
          onCheckedChange={(checked) => autoEvolveMutation.mutate(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          Auto-evolve
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
