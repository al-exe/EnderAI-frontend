import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface OrganizationMemberPublic {
  id: string
  email: string
  full_name?: string | null
  organization_role: OrganizationRole
}

export interface OrganizationInvitationPublic {
  id: string
  organization_id: string
  organization_name?: string | null
  invited_email: string
  invited_by_user_id: string
  created_at: string | null
  accepted_at: string | null
  revoked_at: string | null
}

export interface OrganizationMePublic {
  id: string
  name: string
  created_at: string | null
  updated_at: string | null
  organization_role: OrganizationRole
  members: OrganizationMemberPublic[]
  invitations: OrganizationInvitationPublic[]
}

export type OrganizationRole = "admin" | "member"

export interface OrganizationInvitationsPublic {
  data: OrganizationInvitationPublic[]
  count: number
}

export interface OrganizationInvitationCreate {
  email: string
}

export interface OrganizationMemberUpdate {
  organization_role: OrganizationRole
}

export function readMyOrganization(): CancelablePromise<OrganizationMePublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/organizations/me",
  })
}

export function readMyOrganizationInvitations(): CancelablePromise<OrganizationInvitationsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/organizations/invitations",
  })
}

export function createOrganizationInvitation(
  body: OrganizationInvitationCreate,
): CancelablePromise<OrganizationInvitationPublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/organizations/invitations",
    body,
  })
}

export function acceptOrganizationInvitation(
  invitationId: string,
): CancelablePromise<OrganizationMePublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/organizations/invitations/{invitation_id}/accept",
    path: {
      invitation_id: invitationId,
    },
  })
}

export function updateOrganizationMember(
  userId: string,
  body: OrganizationMemberUpdate,
): CancelablePromise<OrganizationMemberPublic> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/organizations/members/{user_id}",
    path: {
      user_id: userId,
    },
    body,
  })
}
