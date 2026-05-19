import type { ColumnDef } from "@tanstack/react-table"

import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UserActionsMenu } from "./UserActionsMenu"

export type UserTableData = UserPublic & {
  isCurrentUser: boolean
}

function formatLastSeen(value: string | null | undefined): string {
  if (!value) return "Never"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatBillingPeriodEnd(value: string | null | undefined): string {
  if (!value) return "No period end"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown period"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date)
}

function formatSubscriptionStatus(value: string | null | undefined): string {
  if (!value) return "No subscription"

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getBillingBadgeVariant(
  value: string | null | undefined,
): "success" | "destructive" | "secondary" | "outline" {
  if (value === "active" || value === "trialing") return "success"
  if (value === "past_due" || value === "unpaid") return "destructive"
  if (!value || value === "canceled" || value === "incomplete_expired") {
    return "secondary"
  }
  return "outline"
}

export const columns: ColumnDef<UserTableData>[] = [
  {
    accessorKey: "full_name",
    header: "Full Name",
    cell: ({ row }) => {
      const fullName = row.original.full_name
      return (
        <div className="flex items-center gap-2">
          <span
            className={cn("font-medium", !fullName && "text-muted-foreground")}
          >
            {fullName || "N/A"}
          </span>
          {row.original.isCurrentUser && (
            <Badge variant="outline" className="text-xs">
              You
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "is_superuser",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant={row.original.is_superuser ? "default" : "secondary"}>
        {row.original.is_superuser ? "Superuser" : "User"}
      </Badge>
    ),
  },
  {
    accessorKey: "stripe_subscription_status",
    header: "Billing",
    cell: ({ row }) => {
      const status = row.original.stripe_subscription_status
      const cancelsAtPeriodEnd =
        row.original.stripe_subscription_cancel_at_period_end
      const periodEnd = row.original.stripe_subscription_current_period_end

      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={getBillingBadgeVariant(status)}>
            {formatSubscriptionStatus(status)}
          </Badge>
          {status ? (
            <span className="text-xs text-muted-foreground">
              {cancelsAtPeriodEnd ? "Cancels" : "Renews"}{" "}
              {formatBillingPeriodEnd(periodEnd)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not paid</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "last_seen_at",
    header: "Last Seen",
    cell: ({ row }) => (
      <span
        className={cn(
          "text-sm",
          !row.original.last_seen_at && "text-muted-foreground",
        )}
        title={row.original.last_seen_at ?? undefined}
      >
        {formatLastSeen(row.original.last_seen_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <UserActionsMenu user={row.original} />
      </div>
    ),
  },
]
