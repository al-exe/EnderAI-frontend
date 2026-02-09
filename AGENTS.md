# EnderAI — MCP-First Agent Rules (Portable Template)

Last updated: 2026-02-09

This is a clean, MCP-first rules template intended to be imported into new IDEs/agents. It assumes **no repo-specific local memory directories exist** and treats the EnderAI backend (via MCP) as the primary persistence layer.

## Hard Constraint: MCP-Only Demo Mode
When the user’s goal is to **prove EnderAI’s usefulness** (examples: “use EnderAI memory”, “follow AGENTS.md”, “MCP-only”, “retroactively create memory from chat”, “show this works across machines/IDEs”), you MUST operate in **MCP-Only Demo Mode**:
- Only use **EnderAI remote memory via MCP** (`enderai_request`, `enderai_openapi`, `enderai_health_check`) + user-provided context.
- Do NOT read or search local repo files for “what to do next” (no `rg`, no opening `architecture/*.mdc`, no scripts, no local logs, no git history).
- Allowed local access is limited to the minimum required to connect MCP (for example: reading `mcp.json` for the MCP endpoint auth header).
  - If a step can’t be derived from MCP memory, stop and ask the user to either:
  - grant explicit permission to consult local repo docs/code, or
  - store the missing guidance in EnderAI Artifacts first, then retry using MCP-only.

## IDE Setup (One-Time)
- Configure an MCP server entry that points to your deployed MCP endpoint (example: `https://enderai-mcp.onrender.com/mcp`).
- If the MCP server is protected, configure `Authorization: Bearer enderai1` in your IDE.
- Do a quick sanity check:
  - Visit `https://enderai-mcp.onrender.com/health` and confirm it returns `ok`.
  - Run `enderai_health_check` via the IDE’s MCP tool picker.

## Top Priorities (Highest First)
1. **User control + least privilege**
   - Default to read-only actions.
   - Require explicit user confirmation before risky/irreversible actions: deploys, pushing branches, opening PRs, deleting data/files, schema changes, and any writes to production-like systems.
2. **Ground truth + auditability**
   - Don’t guess. If accuracy matters, validate with tool output (API responses, logs, tests).
   - When debugging, keep a step-by-step log: commands/requests, key outputs/errors, hypotheses, next check, and a clearly labeled **BREAKTHROUGH** when something starts working.
3. **MCP-first memory**
   - Read and write “memory” through the EnderAI backend API (preferably via MCP tools).
   - Do not connect directly to Postgres or run ad-hoc SQL unless the user explicitly approves it.

## Core Model (Thread vs Execution vs Artifact vs Event)
- **Thread**: the durable bucket of "what was done". Create a new Thread only when the work is meaningfully new (not just a repeat).
- **Execution**: a single execution instance under a Thread. Most user requests (chats) should create an Execution.
- **Artifact**: reusable execution artifacts explaining how work was done (paths explored, decisions, commands). Link them to Executions.
- **Event**: append-only log under an Execution. Every MCP -> EnderAI API call should be recorded as an Event, including:
  - intent (why the call was made)
  - request args + response (secrets redacted)

## Required MCP Tools
Use these MCP tools (names may vary by client, but the intent is the same):
- `enderai_health_check`
- `enderai_openapi`
- `enderai_request` (generic HTTP request to the EnderAI backend)

## Auth Model (Do Not Confuse These)
There are two independent auth layers:
1. **IDE/Client -> MCP server** auth
   - Default MCP endpoint: `https://enderai-mcp.onrender.com/mcp`
   - Default header: `Authorization: Bearer enderai1`
   - This protects the MCP endpoint itself (for example `https://.../mcp`).
2. **MCP server -> EnderAI backend API** auth
   - Obtain an `access_token` by calling `POST /api/v1/login/access-token`.
    - Pass that token to backend API calls as `bearerToken` in `enderai_request` (or configure the MCP server with `ENDERAI_BEARER_TOKEN` if you control the server environment).

Rules:
- Treat backend access tokens as ephemeral session secrets.

## Default Start-Of-Execution Flow (Most User Requests)
1. Decide on a `workflow_key` (short, stable identifier for the workstream). If unsure, query buckets: `GET /api/v1/artifacts/workflow-keys`.
2. Determine whether this work belongs under an existing Thread:
   - Search Threads: `GET /api/v1/threads/?workflow_key=...&q=...`
   - If needed, inspect recent history: `GET /api/v1/threads/{thread_id}/executions`, then `GET /api/v1/executions/{execution_id}/detail`
3. Start an Execution (this will reuse or create the Thread):
   - `POST /api/v1/executions/start` with a stable `(workflow_key, intent_key)` and a human title.
   - Do **not** create Threads directly via `POST /api/v1/threads/` for normal work; it bypasses Execution creation and breaks auditability.
4. From this point on, every backend call should be attributable:
   - Record each MCP -> EnderAI API call as an Event with request+response+intent.
   - Link any created/used Artifacts to this Execution.

## Artifacts: What To Write (Default)
Default behavior: create/update artifacts so Executions are explainable and repeatable.

Rules:
- Create at least 1 Artifact per Execution capturing the key exploration and decisions (paths, commands, APIs, pitfalls).
- Link created artifacts to the Execution (`relation=created`).
- If an Artifact was consulted during the Execution, link it as `used`.
- If the user explicitly asks not to persist anything, skip artifact writes for that Execution.

Preferred write patterns:
- Rename/update thread title: `PATCH /api/v1/threads/{thread_id}` with `{ "title": "..." }`
- Create reusable guidance (Artifact): `POST /api/v1/artifacts/` (may require elevated permissions)
- Update reusable guidance by superseding: `PUT /api/v1/artifacts/{id}` (creates a new row; never edits in place)

If the backend API does not provide an endpoint for what you want to log (for example: executions, events, links):
- Do not fall back to direct SQL by default.
- Keep an ephemeral worklog in the chat/IDE scratchpad and propose/implement the missing API endpoint.

## Events (Execution Event Log)
Goal: The Execution's Event Log should show the **EnderAI tool calls** (MCP) made during execution.

Preferred:
- Use an MCP server that supports per-call audit metadata, and pass an intent for each `enderai_request`:
  - `audit.intent`: why you are making the call (human readable)
  - (optional) `audit.execution_id`: if you need to force which execution to attach to

Fallback (if the MCP server does not auto-log):
- `POST /api/v1/executions/{execution_id}/events` with `{ "type": "mcp", "message": "<intent>", "data": { "request": ..., "response": ... } }`

Never store secrets in events (redact tokens/passwords).

## Artifact Links (Execution <-> Artifact)
- When you **create** an Artifact during an Execution, link it:
  - `POST /api/v1/executions/{execution_id}/artifact-links` with `{ "artifact_id": "...", "relation": "created" }`
- When you **use** an existing Artifact to guide the Execution, link it:
  - `POST /api/v1/executions/{execution_id}/artifact-links` with `{ "artifact_id": "...", "relation": "used" }`

## Default End-Of-Execution Flow (Promotion)
1. Confirm with the user what should become durable artifacts (what’s reusable vs execution-specific).
2. Prefer “durable, reusable” content in Artifacts (supersede instead of editing in place).
3. Prefer thread hygiene updates that keep navigation easy (rename thread titles to match reality).
4. Never store secrets in written artifacts.

## API Calling Conventions (Via `enderai_request`)
- Always send `path` starting with `/` (never a full URL).
- Use `json` for JSON bodies and `text` for non-JSON (don’t provide both).
- Prefer passing backend auth as `bearerToken` (avoid embedding secrets in headers or stored config).

## Local/Dev Backends (Optional)
- If you run the EnderAI backend locally, the MCP server must point at it (set `ENDERAI_BASE_URL=http://localhost:8000` in the MCP server environment).
- Keep this configuration out of committed files; set it in your deployment/IDE environment.

## Common Failure Modes (MCP Transport)
- A transient `404 Not Found` from the MCP endpoint often indicates a stale session after a redeploy/spin-down. Retry so the client re-initializes.
- If hand-rolling MCP HTTP requests (not recommended), you must use JSON-RPC and include `Accept: application/json, text/event-stream`.
  - Never invent `Mcp-Session-Id` values; initialize first and use the server-issued session id.
