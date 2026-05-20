import { type CancelablePromise, OpenAPI } from "@/client"
import { request } from "@/client/core/request"

export interface V2DocumentSegment {
  text: string
  evidence_anchor_id?: string | null
}

export interface V2DocumentParagraph {
  segments: V2DocumentSegment[]
}

export interface V2DocumentDetailsSection {
  anchor_id: string
  markdown: string
}

export type V2DocumentVisibility = "private" | "organization"
export type V2DocumentAccess = "owner" | "editor" | "viewer"
export type V2DocumentSharePermission = "viewer" | "editor"

export interface V2DocumentSharePublic {
  id: string
  document_id: string
  user_id: string
  email: string
  full_name?: string | null
  permission: V2DocumentSharePermission
  created_at: string | null
  updated_at: string | null
}

export interface V2DocumentPublic {
  id: string
  owner_id: string
  organization_id?: string | null
  folder_id?: string | null
  folder_name?: string | null
  visibility: V2DocumentVisibility
  user_access: V2DocumentAccess
  is_favorite: boolean
  title: string
  description: string
  human_summary: string
  ai_generated_summary: string
  collaborators: string[]
  shared_with: V2DocumentSharePublic[]
  main_body: V2DocumentParagraph[]
  details_file_name: string
  details_markdown_sections: V2DocumentDetailsSection[]
  is_demo: boolean
  created_at: string | null
  updated_at: string | null
}

export interface V2DocumentsPublic {
  data: V2DocumentPublic[]
  count: number
}

export interface V2DocumentUpdate {
  title?: string
  description?: string
  human_summary?: string
  ai_generated_summary?: string
  collaborators?: string[]
  folder_id?: string | null
  visibility?: V2DocumentVisibility
  main_body?: V2DocumentParagraph[]
  details_file_name?: string
  details_markdown_sections?: V2DocumentDetailsSection[]
}

export interface V2DocumentFolderPublic {
  id: string
  owner_id: string
  organization_id?: string | null
  parent_folder_id?: string | null
  name: string
  visibility: V2DocumentVisibility
  created_at: string | null
  updated_at: string | null
}

export interface V2DocumentFoldersPublic {
  data: V2DocumentFolderPublic[]
  count: number
}

export interface V2DocumentFolderCreate {
  name: string
  visibility?: V2DocumentVisibility
  parent_folder_id?: string | null
}

export interface V2DocumentFolderUpdate {
  name?: string
  visibility?: V2DocumentVisibility
  parent_folder_id?: string | null
}

export interface V2DocumentSharesPublic {
  data: V2DocumentSharePublic[]
  count: number
}

export interface V2DocumentSharesUpdate {
  shares: Array<{
    user_id: string
    permission: V2DocumentSharePermission
  }>
}

export function readV2Documents(
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/documents/",
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function readV2DocumentFolders(
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentFoldersPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/documents/folders/",
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function createV2DocumentFolder(
  body: V2DocumentFolderCreate,
): CancelablePromise<V2DocumentFolderPublic> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/v2/documents/folders/",
    body,
  })
}

export function updateV2DocumentFolder(
  folderId: string,
  body: V2DocumentFolderUpdate,
): CancelablePromise<V2DocumentFolderPublic> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/documents/folders/{folder_id}",
    path: {
      folder_id: folderId,
    },
    body,
  })
}

export function deleteV2DocumentFolder(
  folderId: string,
): CancelablePromise<void> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/v2/documents/folders/{folder_id}",
    path: {
      folder_id: folderId,
    },
  })
}

export function readV2Document(
  documentId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/documents/{document_id}",
    path: {
      document_id: documentId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function readV2DocumentShares(
  documentId: string,
): CancelablePromise<V2DocumentSharesPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/v2/documents/{document_id}/shares/",
    path: {
      document_id: documentId,
    },
  })
}

export function replaceV2DocumentShares(
  documentId: string,
  body: V2DocumentSharesUpdate,
): CancelablePromise<V2DocumentSharesPublic> {
  return request(OpenAPI, {
    method: "PUT",
    url: "/api/v1/v2/documents/{document_id}/shares/",
    path: {
      document_id: documentId,
    },
    body,
  })
}

export function favoriteV2Document(
  documentId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentPublic> {
  return request(OpenAPI, {
    method: "PUT",
    url: "/api/v1/v2/documents/{document_id}/favorite",
    path: {
      document_id: documentId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function unfavoriteV2Document(
  documentId: string,
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentPublic> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/v2/documents/{document_id}/favorite",
    path: {
      document_id: documentId,
    },
    query: {
      demo: options.demo || undefined,
    },
  })
}

export function updateV2Document(
  documentId: string,
  body: V2DocumentUpdate,
  options: { demo?: boolean } = {},
): CancelablePromise<V2DocumentPublic> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/v1/v2/documents/{document_id}",
    path: {
      document_id: documentId,
    },
    query: {
      demo: options.demo || undefined,
    },
    body,
  })
}
