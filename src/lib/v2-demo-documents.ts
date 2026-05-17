export type V2DemoDocument = {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  collaborators: string[]
  aiGeneratedSummary: string
  humanSummary: string
  mainBody: Array<{
    segments: Array<{
      text: string
      evidenceAnchorId?: string
    }>
  }>
  detailsFileName: string
  detailsMarkdownSections: Array<{
    anchorId: string
    markdown: string
  }>
}

export const v2DemoDocuments: V2DemoDocument[] = [
  {
    id: "8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32",
    title: "Latest Stale Network Bridge Issue",
    description:
      "Customer-impact investigation with a verified operator fix and command evidence.",
    createdAt: "May 10, 2026",
    updatedAt: "May 12, 2026",
    collaborators: ["Alex Lee", "Nia Patel"],
    aiGeneratedSummary:
      "XYZ Corp traffic hit stale bridge routes after a bridge-controller deploy. The recovery path was validated by refreshing the tenant bridge mapping and confirming post-refresh health checks.",
    humanSummary:
      "XYZ Corp users hit stale bridge routing after a deploy; the validated fix is Alex's bridge refresh script.",
    mainBody: [
      {
        segments: [
          {
            text: "After the bridge-controller deploy, ",
          },
          {
            text: "XYZ Corp users hit stale bridge routing",
            evidenceAnchorId: "affected-users",
          },
          {
            text: ". The incident showed up as intermittent requests crossing old tenant bridge routes rather than the refreshed bridge mapping.",
          },
        ],
      },
      {
        segments: [
          {
            text: "The team recovered the tenant by running ",
          },
          {
            text: "Alex's bridge refresh script and validating post-refresh probes",
            evidenceAnchorId: "validated-fix",
          },
          {
            text: ". The useful operational record is the sequence of logs, script execution, and health checks captured in Details.",
          },
        ],
      },
    ],
    detailsFileName: "latest-stale-network-bridge-issue.details.md",
    detailsMarkdownSections: [
      {
        anchorId: "document-context",
        markdown: [
          "---",
          "document_id: 8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32",
          "title: Latest Stale Network Bridge Issue",
          "created_at: 2026-05-10",
          "updated_at: 2026-05-12",
          "collaborators:",
          "  - Alex Lee",
          "  - Nia Patel",
          "---",
          "",
          "# Latest Stale Network Bridge Issue",
          "",
          "## Purpose",
          "",
          "Capture the full investigation record for the stale bridge routing incident so another agent can understand the customer impact, reproduce the checks, and apply the known fix path without relying on chat history.",
          "",
          "## Executive Context",
          "",
          "A bridge-controller deploy left XYZ Corp traffic reading stale tenant bridge routes. The immediate remediation was to refresh the tenant bridge mapping and verify the post-refresh probes.",
        ].join("\n"),
      },
      {
        anchorId: "affected-users",
        markdown: [
          "<!-- evidence-anchor: affected-users -->",
          "## Affected Users And Symptoms",
          "",
          "XYZ Corp tenants reported intermittent requests crossing stale network bridge routes immediately after the bridge-controller deploy.",
          "",
          "Observed pattern:",
          "",
          "- tenant: `xyz`",
          "- symptom: requests occasionally used old bridge mappings",
          "- timing: began immediately after the bridge-controller rollout",
          "- user impact: intermittent routing failures for XYZ Corp users",
          "",
          "Primary checks:",
          "",
          "```bash",
          "kubectl logs deploy/bridge-controller",
          "kubectl get bridge-routes --tenant xyz",
          "```",
          "",
          "The route table inspection confirmed that the tenant mapping had not refreshed to the expected post-deploy bridge target.",
        ].join("\n"),
      },
      {
        anchorId: "validated-fix",
        markdown: [
          "<!-- evidence-anchor: validated-fix -->",
          "## Validated Fix",
          "",
          "The fix path was to run Alex's tenant bridge refresh script, then verify bridge health with post-refresh probes.",
          "",
          "Command used:",
          "",
          "```bash",
          "./infra/network/bridge-refresh.sh --tenant xyz",
          "```",
          "",
          "Files referenced:",
          "",
          "- `infra/network/bridge-refresh.sh`",
          "- `ops/runbooks/network-bridge.md`",
          "",
          "Verification:",
          "",
          "- route table changed to the expected bridge target",
          "- post-refresh health probes passed",
          "- no additional stale-route reports arrived for XYZ Corp after the refresh",
        ].join("\n"),
      },
      {
        anchorId: "commands",
        markdown: [
          "<!-- evidence-anchor: commands -->",
          "## Commands Run",
          "",
          "```bash",
          "kubectl logs deploy/bridge-controller",
          "kubectl get bridge-routes --tenant xyz",
          "./infra/network/bridge-refresh.sh --tenant xyz",
          "./ops/probes/bridge-health --tenant xyz",
          "```",
          "",
          "## Open Follow-Up",
          "",
          "- Add a bridge-controller post-deploy check that detects stale tenant route mappings before users report symptoms.",
          "- Add the tenant refresh command to the operator quick-reference runbook.",
        ].join("\n"),
      },
    ],
  },
  {
    id: "5b7462e9-6b0e-4d48-81a2-07f052534a12",
    title: "V2 Document Evidence Contract",
    description:
      "Design note for Summary claims backed by source anchors in Details.",
    createdAt: "May 13, 2026",
    updatedAt: "May 14, 2026",
    collaborators: ["Alex Lee", "Jordan Kim"],
    aiGeneratedSummary:
      "The V2 document model should keep executive summaries short while making each claim traceable to a Details section or another source document.",
    humanSummary:
      "Human summaries should stay short, but each claim needs a direct path to detailed evidence.",
    mainBody: [
      {
        segments: [
          {
            text: "The Summary view should tell a short story first: what happened, why it matters, and what changed. ",
          },
          {
            text: "It should stay succinct and executive-oriented",
            evidenceAnchorId: "summary-shape",
          },
          {
            text: " so a reader can understand the outcome without reading the full working log.",
          },
        ],
      },
      {
        segments: [
          {
            text: "The detail should still be verifiable. ",
          },
          {
            text: "Each important Summary claim needs a direct path to supporting evidence",
            evidenceAnchorId: "claim-evidence",
          },
          {
            text: ", whether that evidence lives in Details or another linked document.",
          },
        ],
      },
    ],
    detailsFileName: "v2-document-evidence-contract.details.md",
    detailsMarkdownSections: [
      {
        anchorId: "document-context",
        markdown: [
          "---",
          "document_id: 5b7462e9-6b0e-4d48-81a2-07f052534a12",
          "title: V2 Document Evidence Contract",
          "created_at: 2026-05-13",
          "updated_at: 2026-05-14",
          "collaborators:",
          "  - Alex Lee",
          "  - Jordan Kim",
          "---",
          "",
          "# V2 Document Evidence Contract",
          "",
          "## Purpose",
          "",
          "Define how Taskforce V2 documents should preserve a concise human Summary while retaining enough Details for an AI agent to reconstruct the work.",
        ].join("\n"),
      },
      {
        anchorId: "summary-shape",
        markdown: [
          "<!-- evidence-anchor: summary-shape -->",
          "## Summary Shape",
          "",
          "The Summary view is intentionally succinct and executive-oriented. It should capture intent, outcome, and high-level points without exposing the full capture log by default.",
          "",
          "The Summary should answer:",
          "",
          "- what happened",
          "- why it mattered",
          "- what changed",
          "- what the next reader should do",
        ].join("\n"),
      },
      {
        anchorId: "claim-evidence",
        markdown: [
          "<!-- evidence-anchor: claim-evidence -->",
          "## Claim Evidence Links",
          "",
          "Every important Summary claim must point to an evidence anchor in Details or another document.",
          "",
          "Implementation notes:",
          "",
          "- inline highlighted Summary text stores an `evidenceAnchorId`",
          "- Details markdown uses `<!-- evidence-anchor: anchor-id -->` comments",
          "- clicking a Summary claim switches to Details and highlights the matching markdown section",
          "- the Details content remains valid markdown when concatenated",
          "",
          "Referenced files:",
          "",
          "- `src/lib/v2-demo-documents.ts`",
          "- `src/routes/v2/library.$documentId.tsx`",
          "- `tests/taskforce-shell.spec.ts`",
        ].join("\n"),
      },
      {
        anchorId: "commands",
        markdown: [
          "<!-- evidence-anchor: commands -->",
          "## Commands Run",
          "",
          "```bash",
          'rg "human-friendly|AI-friendly" src tests AGENTS.md',
          "npm run build",
          "node node_modules/playwright/cli.js test tests/taskforce-shell.spec.ts",
          "```",
        ].join("\n"),
      },
    ],
  },
  {
    id: "0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d",
    title: "Hosted MCP Credential Setup Refresh",
    description:
      "Setup guidance for connecting an AI client with file-backed token persistence.",
    createdAt: "May 15, 2026",
    updatedAt: "May 17, 2026",
    collaborators: ["Alex Lee"],
    aiGeneratedSummary:
      "The hosted MCP setup now emphasizes file-backed token persistence, fresh-terminal reconnect steps, and a V2-specific document instruction set for V2-enabled users.",
    humanSummary:
      "Fresh terminals prevent stale MCP credentials from persisting after token creation or rotation.",
    mainBody: [
      {
        segments: [
          {
            text: "The credential setup flow was refreshed because token rotation can leave old environment values in already-open shells. ",
          },
          {
            text: "Starting from a fresh terminal prevents stale MCP credentials from persisting",
            evidenceAnchorId: "fresh-terminal",
          },
          {
            text: " after a token is created or rotated.",
          },
        ],
      },
      {
        segments: [
          {
            text: "For V2-enabled users, the setup instructions now push agents toward Taskforce documents instead of legacy cases. ",
          },
          {
            text: "Those users should receive document creation, update, and finalize instructions",
            evidenceAnchorId: "v2-instructions",
          },
          {
            text: " so meaningful work is captured as a Summary backed by Details.",
          },
        ],
      },
    ],
    detailsFileName: "hosted-mcp-credential-setup-refresh.details.md",
    detailsMarkdownSections: [
      {
        anchorId: "document-context",
        markdown: [
          "---",
          "document_id: 0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d",
          "title: Hosted MCP Credential Setup Refresh",
          "created_at: 2026-05-15",
          "updated_at: 2026-05-17",
          "collaborators:",
          "  - Alex Lee",
          "---",
          "",
          "# Hosted MCP Credential Setup Refresh",
          "",
          "## Purpose",
          "",
          "Capture the setup behavior and V2 instruction updates for hosted MCP credentials so future agents know how credentials should be created, rotated, and documented.",
        ].join("\n"),
      },
      {
        anchorId: "fresh-terminal",
        markdown: [
          "<!-- evidence-anchor: fresh-terminal -->",
          "## Fresh Terminal Requirement",
          "",
          "The setup flow tells users to start from a fresh terminal after creating or rotating an MCP credential so the shell reloads `ENDERAI_MCP_TOKEN` from `~/.enderai_mcp_token`.",
          "",
          "Reason:",
          "",
          "- existing shells may keep the previous token in memory",
          "- file-backed token persistence only helps after the shell reloads the environment",
          "- reconnecting the AI client from a fresh terminal avoids stale credential handshakes",
        ].join("\n"),
      },
      {
        anchorId: "v2-instructions",
        markdown: [
          "<!-- evidence-anchor: v2-instructions -->",
          "## V2 Instruction Set",
          "",
          "V2-enabled users receive instructions to prefer the Taskforce V2 document toolset, create a document at the start of meaningful work, and maintain Summary and Details document views.",
          "",
          "Expected agent behavior:",
          "",
          "- create a Taskforce document at the start of meaningful work",
          "- update the document as files, links, commands, decisions, and outcomes develop",
          "- keep the Summary concise and useful for a human reader",
          "- keep Details as a markdown context file that an AI agent can ingest later",
          "- finalize the document when the work completes or stops",
        ].join("\n"),
      },
      {
        anchorId: "files-commands",
        markdown: [
          "<!-- evidence-anchor: files-commands -->",
          "## Files And Commands",
          "",
          "Files touched:",
          "",
          "- `src/components/UserSettings/ConnectAgent.tsx`",
          "- `AGENTS.md`",
          "- `src/lib/v2-demo-documents.ts`",
          "- `src/routes/v2/library.$documentId.tsx`",
          "- `tests/taskforce-shell.spec.ts`",
          "- `tests/user-settings.spec.ts`",
          "",
          "Validation:",
          "",
          "```bash",
          "npm run build",
          'node node_modules/playwright/cli.js test tests/taskforce-shell.spec.ts tests/user-settings.spec.ts --project=chromium --no-deps -g "Taskforce v2 library|V2 document instructions"',
          "```",
        ].join("\n"),
      },
    ],
  },
]

export function findV2DemoDocument(documentId: string) {
  return v2DemoDocuments.find((document) => document.id === documentId)
}
