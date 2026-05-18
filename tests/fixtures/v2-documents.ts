import type { Page } from "@playwright/test"

const bridgeId = "8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32"
const evidenceId = "5b7462e9-6b0e-4d48-81a2-07f052534a12"
const hostedMcpId = "0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d"

const documents = [
  {
    id: bridgeId,
    title: "Latest Stale Network Bridge Issue",
    description:
      "Customer-impact investigation with a verified operator fix and command evidence.",
    human_summary:
      "XYZ Corp users hit stale bridge routing after a deploy; the validated fix is Alex's bridge refresh script.",
    ai_generated_summary:
      "XYZ Corp traffic hit stale bridge routes after a bridge-controller deploy.",
    collaborators: ["Alex Lee", "Nia Patel"],
    main_body: [
      {
        segments: [
          { text: "After the bridge-controller deploy, " },
          {
            text: "XYZ Corp users hit stale bridge routing",
            evidence_anchor_id: "affected-users",
          },
          { text: "." },
        ],
      },
    ],
    details_file_name: "latest-stale-network-bridge-issue.details.md",
    details_markdown_sections: [
      {
        anchor_id: "affected-users",
        markdown:
          "<!-- evidence-anchor: affected-users -->\n## Affected Users And Symptoms\nXYZ Corp tenants reported intermittent requests crossing stale bridge routes.",
      },
    ],
    is_demo: true,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
  },
  {
    id: evidenceId,
    title: "V2 Document Evidence Contract",
    description:
      "Design note for Summary claims backed by source anchors in Details.",
    human_summary:
      "Human summaries should stay short, but each claim needs a direct path to detailed evidence.",
    ai_generated_summary:
      "The V2 document model should keep executive summaries short.",
    collaborators: ["Alex Lee", "Jordan Kim"],
    main_body: [{ segments: [{ text: "Summary view tells a short story." }] }],
    details_file_name: "v2-document-evidence-contract.details.md",
    details_markdown_sections: [
      {
        anchor_id: "summary-shape",
        markdown:
          "<!-- evidence-anchor: summary-shape -->\n## Summary Shape\nThe Summary is executive-oriented.",
      },
    ],
    is_demo: true,
    created_at: "2026-05-13T00:00:00Z",
    updated_at: "2026-05-14T00:00:00Z",
  },
  {
    id: hostedMcpId,
    title: "Hosted MCP Credential Setup Refresh",
    description:
      "Setup guidance for connecting an AI client with file-backed token persistence.",
    human_summary:
      "Fresh terminals prevent stale MCP credentials from persisting after token creation or rotation.",
    ai_generated_summary:
      "The hosted MCP setup now emphasizes file-backed token persistence.",
    collaborators: ["Alex Lee"],
    main_body: [
      { segments: [{ text: "The credential setup flow was refreshed." }] },
    ],
    details_file_name: "hosted-mcp-credential-setup-refresh.details.md",
    details_markdown_sections: [
      {
        anchor_id: "fresh-terminal",
        markdown:
          "<!-- evidence-anchor: fresh-terminal -->\n## Fresh Terminal Requirement",
      },
    ],
    is_demo: true,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-17T00:00:00Z",
  },
]

export async function mockV2Documents(page: Page) {
  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname
    const method = route.request().method()
    const isDemoRequest = url.searchParams.get("demo") === "true"

    if (pathname === "/api/v1/v2/documents/" && method === "GET") {
      if (!isDemoRequest) {
        await route.fulfill({ json: { data: [], count: 0 } })
        return
      }

      await route.fulfill({
        json: { data: documents, count: documents.length },
      })
      return
    }

    const detailMatch = pathname.match(/^\/api\/v1\/v2\/documents\/([^/]+)\/?$/)
    if (detailMatch) {
      const id = detailMatch[1]
      const document = documents.find((d) => d.id === id)
      if (!document) {
        await route.fulfill({ status: 404, json: { detail: "Not found" } })
        return
      }
      if (method === "GET") {
        await route.fulfill({ json: document })
        return
      }
      if (method === "PATCH") {
        const body = JSON.parse(route.request().postData() ?? "{}")
        await route.fulfill({ json: { ...document, ...body } })
        return
      }
    }

    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
}
