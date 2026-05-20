import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  Check,
  MailPlus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
} from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  type OrganizationInvitationPublic,
  type OrganizationMemberPublic,
  type OrganizationRole,
  readMyOrganization,
  readMyOrganizationInvitations,
  removeOrganizationMember,
  updateMyOrganization,
  updateOrganizationMember,
} from "@/api/organizations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const organizationQueryKey = ["my-organization"]
const incomingInvitationsQueryKey = ["my-organization-invitations"]

function formatDate(value: string | null): string {
  if (!value) return "Not available"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function roleLabel(role: OrganizationRole): string {
  return role === "admin" ? "Admin" : "Member"
}

function RoleBadge({ role }: { role: OrganizationRole }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>
      {role === "admin" && <Shield className="size-3" />}
      {roleLabel(role)}
    </Badge>
  )
}

function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

function OrganizationSettings() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [inviteEmail, setInviteEmail] = useState("")
  const [organizationName, setOrganizationName] = useState("")

  const organizationQuery = useQuery({
    queryKey: organizationQueryKey,
    queryFn: readMyOrganization,
  })

  const incomingInvitationsQuery = useQuery({
    queryKey: incomingInvitationsQueryKey,
    queryFn: readMyOrganizationInvitations,
  })

  const inviteMutation = useMutation({
    mutationFn: (email: string) => createOrganizationInvitation({ email }),
    onSuccess: () => {
      setInviteEmail("")
      showSuccessToast("Invitation sent")
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    },
    onError: handleError.bind(showErrorToast),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptOrganizationInvitation,
    onSuccess: () => {
      showSuccessToast("Invitation accepted")
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
      void queryClient.invalidateQueries({
        queryKey: incomingInvitationsQueryKey,
      })
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string
      role: OrganizationRole
    }) => updateOrganizationMember(userId, { organization_role: role }),
    onSuccess: () => {
      showSuccessToast("Member role updated")
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    },
    onError: handleError.bind(showErrorToast),
  })

  const removeMemberMutation = useMutation({
    mutationFn: removeOrganizationMember,
    onSuccess: () => {
      showSuccessToast("Member removed")
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    },
    onError: handleError.bind(showErrorToast),
  })

  const organization = organizationQuery.data
  const incomingInvitations = incomingInvitationsQuery.data?.data ?? []
  const isAdmin = organization?.organization_role === "admin"
  const trimmedOrganizationName = organizationName.trim()
  const organizationNameChanged =
    organization !== undefined && trimmedOrganizationName !== organization.name
  const canUpdateOrganizationName =
    isAdmin && trimmedOrganizationName.length > 0 && organizationNameChanged

  const organizationMutation = useMutation({
    mutationFn: (name: string) => updateMyOrganization({ name }),
    onSuccess: (updatedOrganization) => {
      setOrganizationName(updatedOrganization.name)
      showSuccessToast("Organization name updated")
      void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    },
    onError: handleError.bind(showErrorToast),
  })

  useEffect(() => {
    if (organization) {
      setOrganizationName(organization.name)
    }
  }, [organization])

  const submitInvitation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    inviteMutation.mutate(email)
  }

  const submitOrganizationName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canUpdateOrganizationName) return
    organizationMutation.mutate(trimmedOrganizationName)
  }

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: organizationQueryKey })
    void queryClient.invalidateQueries({
      queryKey: incomingInvitationsQueryKey,
    })
  }

  if (organizationQuery.isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Loading organization...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (organizationQuery.error || !organization) {
    return (
      <div className="max-w-4xl space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Organization unavailable</AlertTitle>
          <AlertDescription>
            Could not load your organization details.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={refresh}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-4">
      <IncomingInvitations
        invitations={incomingInvitations}
        loading={incomingInvitationsQuery.isLoading}
        acceptingInvitationId={
          acceptMutation.isPending
            ? (acceptMutation.variables as string | undefined)
            : undefined
        }
        onAccept={(invitationId) => acceptMutation.mutate(invitationId)}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>{organization.name}</CardDescription>
          <CardAction>
            <RoleBadge role={organization.organization_role} />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <dt className="text-muted-foreground">Members</dt>
              <dd className="mt-1 text-lg font-semibold">
                {organization.members.length}
              </dd>
            </div>
            <div className="rounded-md border p-3">
              <dt className="text-muted-foreground">Pending invites</dt>
              <dd className="mt-1 text-lg font-semibold">
                {organization.invitations.length}
              </dd>
            </div>
            <div className="rounded-md border p-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1 font-medium">
                {formatDate(organization.created_at)}
              </dd>
            </div>
          </dl>

          {isAdmin && (
            <form
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={submitOrganizationName}
            >
              <div className="space-y-1">
                <label
                  htmlFor="organization-name"
                  className="text-sm font-medium"
                >
                  Organization name
                </label>
                <Input
                  id="organization-name"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Organization name"
                  aria-label="Organization name"
                />
              </div>
              <LoadingButton
                type="submit"
                className="self-end"
                loading={organizationMutation.isPending}
                disabled={!canUpdateOrganizationName}
              >
                Save name
              </LoadingButton>
            </form>
          )}

          {isAdmin && (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={submitInvitation}
            >
              <Input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
                aria-label="Invitation email"
              />
              <LoadingButton
                type="submit"
                loading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
              >
                <MailPlus className="size-4" />
                Invite
              </LoadingButton>
            </form>
          )}

          <MembersTable
            members={organization.members}
            currentUserId={currentUser?.id}
            isAdmin={isAdmin}
            pendingMemberId={
              roleMutation.isPending
                ? roleMutation.variables?.userId
                : undefined
            }
            removingMemberId={
              removeMemberMutation.isPending
                ? removeMemberMutation.variables
                : undefined
            }
            onRoleChange={(member, role) => {
              if (member.organization_role === role) return
              roleMutation.mutate({ userId: member.id, role })
            }}
            onRemove={(member) => removeMemberMutation.mutate(member.id)}
          />

          <PendingInvitations invitations={organization.invitations} />
        </CardContent>
      </Card>
    </div>
  )
}

function IncomingInvitations({
  invitations,
  loading,
  acceptingInvitationId,
  onAccept,
}: {
  invitations: OrganizationInvitationPublic[]
  loading: boolean
  acceptingInvitationId?: string
  onAccept: (invitationId: string) => void
}) {
  if (loading || invitations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MailPlus className="size-5 text-muted-foreground" />
          <CardTitle>Invitations</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {invitation.organization_name ?? "Organization invitation"}
              </div>
              <div className="text-sm text-muted-foreground">
                Sent {formatDate(invitation.created_at)}
              </div>
            </div>
            <LoadingButton
              type="button"
              size="sm"
              loading={acceptingInvitationId === invitation.id}
              onClick={() => onAccept(invitation.id)}
            >
              <Check className="size-4" />
              Accept
            </LoadingButton>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MembersTable({
  members,
  currentUserId,
  isAdmin,
  pendingMemberId,
  removingMemberId,
  onRoleChange,
  onRemove,
}: {
  members: OrganizationMemberPublic[]
  currentUserId?: string
  isAdmin: boolean
  pendingMemberId?: string
  removingMemberId?: string
  onRoleChange: (
    member: OrganizationMemberPublic,
    role: OrganizationRole,
  ) => void
  onRemove: (member: OrganizationMemberPublic) => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <h3 className="font-semibold">Members</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {isAdmin && (
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 && (
            <EmptyRow colSpan={isAdmin ? 4 : 3}>No members found.</EmptyRow>
          )}
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId
            const roleControlDisabled =
              !isAdmin ||
              isCurrentUser ||
              pendingMemberId === member.id ||
              removingMemberId === member.id

            return (
              <TableRow key={member.id}>
                <TableCell className="max-w-[12rem] truncate">
                  {member.full_name || "N/A"}
                </TableCell>
                <TableCell className="max-w-[18rem] truncate">
                  {member.email}
                </TableCell>
                <TableCell>
                  {isAdmin && !isCurrentUser ? (
                    <Select
                      value={member.organization_role}
                      disabled={roleControlDisabled}
                      onValueChange={(value) =>
                        onRoleChange(member, value as OrganizationRole)
                      }
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={member.organization_role} />
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={removingMemberId === member.id}
                      disabled={isCurrentUser}
                      onClick={() => onRemove(member)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </LoadingButton>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

function PendingInvitations({
  invitations,
}: {
  invitations: OrganizationInvitationPublic[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MailPlus className="size-5 text-muted-foreground" />
        <h3 className="font-semibold">Pending invitations</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.length === 0 && (
            <EmptyRow colSpan={2}>No pending invitations.</EmptyRow>
          )}
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="max-w-[20rem] truncate">
                {invitation.invited_email}
              </TableCell>
              <TableCell>{formatDate(invitation.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

export default OrganizationSettings
