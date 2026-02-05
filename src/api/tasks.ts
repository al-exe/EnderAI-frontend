import { OpenAPI, type CancelablePromise } from "@/client"
import { request } from "@/client/core/request"

import type { LibraryItemPublic } from "@/api/library"

export interface TaskPublic {
  id: string
  title: string
  workflow_key: string
  goal: string | null
  acceptance_criteria: string | null
  systems_touched: Record<string, unknown>
  risk_level: string
  status: string
  created_at: string | null
  last_touched_at: string | null
}

export interface TasksPublic {
  data: TaskPublic[]
  count: number
}

export interface RunPublic {
  id: string
  task_id: string
  targets: unknown[]
  started_at: string | null
  ended_at: string | null
  status: string
  summary: string | null
}

export interface RunsPublic {
  data: RunPublic[]
  count: number
}

export interface RunEventPublic {
  id: number
  run_id: string
  ts: string | null
  type: string
  message: string | null
  data: Record<string, unknown>
  supersedes_event_id: number | null
}

export type RunLibraryRelation = "used" | "created" | "promoted" | "superseded"

export interface RunMemoryLinkPublic {
  relation: RunLibraryRelation
  created_at: string | null
  library_item: LibraryItemPublic
}

export interface RunDetailPublic {
  run: RunPublic
  events: RunEventPublic[]
  memory_links: RunMemoryLinkPublic[]
}

export interface ReadTasksParams {
  workflow_key?: string
  status?: string
  q?: string
  skip?: number
  limit?: number
}

export function readTasks(
  params: ReadTasksParams = {},
): CancelablePromise<TasksPublic> {
  const workflow_key = params.workflow_key?.trim() || undefined
  const status = params.status?.trim() || undefined
  const q = params.q?.trim() || undefined

  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/tasks/",
    query: {
      workflow_key,
      status,
      q,
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readTaskRuns(
  taskId: string,
  params: { skip?: number; limit?: number } = {},
): CancelablePromise<RunsPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/tasks/{task_id}/runs",
    path: {
      task_id: taskId,
    },
    query: {
      skip: params.skip,
      limit: params.limit,
    },
  })
}

export function readRunDetail(runId: string): CancelablePromise<RunDetailPublic> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/v1/runs/{run_id}/detail",
    path: {
      run_id: runId,
    },
  })
}

