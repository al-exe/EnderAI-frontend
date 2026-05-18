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

export interface V2DocumentPublic {
  id: string
  title: string
  description: string
  human_summary: string
  ai_generated_summary: string
  collaborators: string[]
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
  main_body?: V2DocumentParagraph[]
  details_file_name?: string
  details_markdown_sections?: V2DocumentDetailsSection[]
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
