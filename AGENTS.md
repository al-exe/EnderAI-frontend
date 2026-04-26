# EnderAI — MCP-First Agent Rules (Portable Template)

Last updated: 2026-04-26

## Integration Pause
- Do not use EnderAI MCP tools unless Alex explicitly asks to use EnderAI MCP again.
- Do not use Jira or Atlassian tools unless Alex explicitly asks to use Jira again.
- Ignore the MCP-first workflow and Jira delivery workflow below while this pause is active.
- For code changes, work locally and use git/GitHub only when requested by the user or by normal repo workflow.

This template is intended for agents and IDEs that use EnderAI through MCP.

It assumes:
- EnderAI remote memory is the primary persistence layer
- the hosted MCP endpoint is the main integration surface
- the canonical workflow is `Topic / Case / ContextPack`

## Hard Constraint: MCP-Only Demo Mode
When the user explicitly wants to prove EnderAI memory value across tools or machines, operate in MCP-only demo mode:
- use EnderAI remote memory via MCP plus user-provided context
- do not consult local repo guidance unless the user explicitly allows it
- if required context is missing, ask the user to permit local inspection or store the missing guidance in EnderAI first

## Required MCP Tools
Prefer these tools:
- `enderai_begin_case`
- `enderai_update_case`
- `enderai_finish_case`
- `enderai_session_info`
- `enderai_request`
- `enderai_health_check`
- `enderai_openapi`

## Auth Model
There is one user-scoped auth token in the normal hosted flow:
- `Authorization: Bearer ${env:ENDERAI_MCP_TOKEN}`

The hosted MCP validates that token and reuses it for backend API calls on behalf of the same user.

## Meaningful Work Workflow
For meaningful user-initiated work:
1. call `enderai_begin_case`
2. let EnderAI auto-hydrate relevant prior context before work begins
3. do the work
4. call `enderai_update_case` as material findings, commands, hypotheses, or changes develop
5. call `enderai_finish_case` when the work is complete or stops

## Delivery Workflow
For repo-level fix requests, bug lists, or cleanup batches:
1. create a Jira ticket with relevant context before coding unless the user explicitly says not to
2. do the work on a branch and open a PR
3. link the Jira ticket in the PR and add the PR URL back to Jira
4. merge after validation unless the user explicitly asks to hold the PR open

## Default Behavior
- prefer guided case tools over raw `enderai_request`
- use `enderai_request` mainly as an escape hatch for uncovered endpoints
- avoid write-like `enderai_request` calls without an active case
- do not store secrets in case updates or event data

## Verification
After connecting a client:
1. run `enderai_session_info`
2. verify the session is authenticated and ready
3. start a real task and confirm the agent begins with `enderai_begin_case`

## Common Failure Modes
- a stale MCP session after a redeploy may require the client to reconnect
- if the client sees EnderAI tools but does not use them, reinforce the workflow reminder in local instructions
- if a write-like raw request is rejected, start with `enderai_begin_case` so EnderAI can auto-hydrate context first
