import { OpenAPI, type CancelablePromise } from "@/client"
import { request } from "@/client/core/request"

export type LibraryItemKind = "recipe" | "pitfall" | "decision" | "checklist"

export interface LibraryItemPublic {
  id: string
  workflow_key: string
  kind: LibraryItemKind
  title: string
  body_mdc: string
  tags: Record<string, unknown>
  source_refs: unknown[]
  promotion_mode: "auto" | "user"
  created_at: string | null
  last_used_at: string | null
  superseded_by_id: string | null
}

export interface LibraryItemsPublic {
  data: LibraryItemPublic[]
  count: number
}

export interface WorkflowKeyCount {
  workflow_key: string
  bucket_name: string
  count: number
}

export interface WorkflowKeysPublic {
  data: WorkflowKeyCount[]
}

export interface ReadLibraryItemsParams {
  workflow_key?: string
  kind?: LibraryItemKind
  q?: string
  current_only?: boolean
  skip?: number
  limit?: number
}

export function readLibraryItems(
  params: ReadLibraryItemsParams = {},
): CancelablePromise<LibraryItemsPublic> {
  const workflow_key = params.workflow_key?.trim() || undefined
  const q = params.q?.trim() || undefined

  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/library/",
    query: {
      workflow_key,
      kind: params.kind,
      q,
      current_only: params.current_only,
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readLibraryWorkflowKeys(params: {
  current_only?: boolean
} = {}): CancelablePromise<WorkflowKeysPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/library/workflow-keys",
    query: {
      current_only: params.current_only,
    },
  })
}
