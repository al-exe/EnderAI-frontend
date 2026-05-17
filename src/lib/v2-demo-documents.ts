export type V2DemoDocument = {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  collaborators: string[]
  status: string
  aiGeneratedSummary: string
  humanSummary: string
  mainBody: Array<{
    segments: Array<{
      text: string
      evidenceAnchorId?: string
    }>
  }>
  aiSections: Array<{
    anchorId: string
    heading: string
    body: string
  }>
}

export const v2DemoDocuments: V2DemoDocument[] = [
  {
    id: "8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32",
    title: "Latest Stale Network Bridge Issue",
    description:
      "Customer-impact investigation with a verified operator fix and command evidence.",
    createdAt: "May 10",
    updatedAt: "May 12",
    collaborators: ["Alex Lee", "Nia Patel"],
    status: "Resolved",
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
            text: ". The useful operational record is the sequence of logs, script execution, and health checks captured in the AI-friendly details.",
          },
        ],
      },
    ],
    aiSections: [
      {
        anchorId: "affected-users",
        heading: "Affected Users And Symptoms",
        body: "XYZ Corp tenants reported intermittent requests crossing stale network bridge routes immediately after the bridge-controller deploy. The relevant checks were `kubectl logs deploy/bridge-controller` and tenant-specific route table inspection.",
      },
      {
        anchorId: "validated-fix",
        heading: "Validated Fix",
        body: "The fix path used `infra/network/bridge-refresh.sh --tenant xyz`, then verified bridge health with post-refresh probes. Supporting files were `infra/network/bridge-refresh.sh` and `ops/runbooks/network-bridge.md`.",
      },
      {
        anchorId: "commands",
        heading: "Commands Run",
        body: "Commands captured: `kubectl logs deploy/bridge-controller`, `./bridge-refresh.sh --tenant xyz`, and bridge health probes after the refresh.",
      },
    ],
  },
  {
    id: "5b7462e9-6b0e-4d48-81a2-07f052534a12",
    title: "V2 Document Evidence Contract",
    description:
      "Design note for human-summary claims backed by AI-friendly source anchors.",
    createdAt: "May 13",
    updatedAt: "May 14",
    collaborators: ["Alex Lee", "Jordan Kim"],
    status: "Draft",
    aiGeneratedSummary:
      "The V2 document model should keep executive summaries short while making each claim traceable to an AI-friendly detail section or another source document.",
    humanSummary:
      "Human summaries should stay short, but each claim needs a direct path to detailed evidence.",
    mainBody: [
      {
        segments: [
          {
            text: "The human-readable view should tell a short story first: what happened, why it matters, and what changed. ",
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
            text: "Each important human-readable claim needs a direct path to supporting evidence",
            evidenceAnchorId: "claim-evidence",
          },
          {
            text: ", whether that evidence lives in the AI-friendly detail view or another linked document.",
          },
        ],
      },
    ],
    aiSections: [
      {
        anchorId: "summary-shape",
        heading: "Human Summary Shape",
        body: "The human-readable view is intentionally succinct and executive-oriented. It should capture intent, outcome, and high-level points without exposing the full capture log by default.",
      },
      {
        anchorId: "claim-evidence",
        heading: "Claim Evidence Links",
        body: "Every human summary claim points to an evidence anchor in the AI-friendly view or another document. Related implementation references include `docs/topic-case-contextpack-model.md` and `src/routes/v2/library.tsx`.",
      },
      {
        anchorId: "commands",
        heading: "Commands Run",
        body: 'Commands captured for this design note included `rg "ContextPack"` and `npm run build`.',
      },
    ],
  },
  {
    id: "0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d",
    title: "Hosted MCP Credential Setup Refresh",
    description:
      "Setup guidance for connecting an AI client with file-backed token persistence.",
    createdAt: "May 15",
    updatedAt: "May 17",
    collaborators: ["Alex Lee"],
    status: "Ready",
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
            text: " so meaningful work is captured as a human-readable summary backed by AI-friendly detail.",
          },
        ],
      },
    ],
    aiSections: [
      {
        anchorId: "fresh-terminal",
        heading: "Fresh Terminal Requirement",
        body: "The setup flow tells users to start from a fresh terminal after creating or rotating an MCP credential so the shell reloads `ENDERAI_MCP_TOKEN` from `~/.enderai_mcp_token`.",
      },
      {
        anchorId: "v2-instructions",
        heading: "V2 Instruction Set",
        body: "V2-enabled users receive instructions to prefer the V2 MCP document toolset, create a document at the start of meaningful work, and maintain human-friendly and AI-friendly document views.",
      },
      {
        anchorId: "files-commands",
        heading: "Files And Commands",
        body: "Files touched: `src/components/UserSettings/ConnectAgent.tsx`, `AGENTS.md`, and V2 demo routes. Validation included `npm run build` and targeted Playwright specs.",
      },
    ],
  },
]

export function findV2DemoDocument(documentId: string) {
  return v2DemoDocuments.find((document) => document.id === documentId)
}
