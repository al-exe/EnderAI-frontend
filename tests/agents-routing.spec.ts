import { expect, type Page, test } from "@playwright/test"

import { mockV2Documents } from "./fixtures/v2-documents"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: false,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
  v2: true,
  subscription_tier: "free",
}

const agents = [
  {
    id: "agent-1",
    slug: "jensen",
    name: "Jensen",
    role: "Billing Reliability Specialist",
    short_description:
      "Stripe webhooks, subscriptions, and double-charge prevention.",
    domain_tags: ["Stripe", "Billing", "Webhooks", "Reliability"],
    status: "active",
    linked_docs_count: 3,
    invocations_count: 12,
    tokens_saved: 42000,
    last_invoked_at: "2026-05-24T12:00:00Z",
  },
  {
    id: "agent-2",
    slug: "mira",
    name: "Mira",
    role: "Search & Retrieval Specialist",
    short_description:
      "Indexer drift, pgvector retrieval, and citation anchors.",
    domain_tags: ["Search", "Retrieval", "Citations"],
    status: "active",
    linked_docs_count: 2,
    invocations_count: 4,
    tokens_saved: 12000,
    last_invoked_at: null,
  },
]

const jensenDetail = {
  id: "agent-1",
  slug: "jensen",
  name: "Jensen",
  role: "Billing Reliability Specialist",
  description:
    "Helps debug Stripe billing, subscription upgrades, webhook retries, idempotency, duplicate invoices, and customer double-charge incidents.",
  domain_tags: ["Stripe", "Billing", "Webhooks", "Reliability"],
  routing_triggers: ["stripe", "webhook", "subscription", "plan upgrade"],
  negative_triggers: ["pricing page copy", "frontend billing UI"],
  instructions: [
    "Check inbound webhook idempotency before changing fulfillment logic.",
    "Prefer route-boundary WAL dedupe for Stripe retries.",
  ],
  linked_knowledge: [
    {
      document_id: "doc-1",
      title: "Stripe webhook idempotency strategy",
      description: "Decision record for route-boundary WAL dedupe.",
      anchor_id: "decision-wal-table",
      href: "/v2/library/doc-1#decision-wal-table",
      reason: "Pinned decision record",
    },
  ],
  recent_invocations: [
    {
      id: "event-1",
      prompt: "Stripe is double-charging some users on plan upgrades.",
      summary: "Fixed webhook replay ordering regression.",
      session_id: "session-1",
      repo: "taskforce-claude",
      branch: "demo/stripe-double-charge",
      documents_consulted_count: 2,
      tokens_saved: 28432,
      created_at: "2026-05-24T12:00:00Z",
    },
  ],
  stats: {
    invocations_count: 12,
    linked_docs_count: 3,
    tokens_saved: 42000,
    usd_saved: "0.630000",
  },
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockAgentsShell(page: Page, options: { empty?: boolean } = {}) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/v1/users/me") {
      await route.fulfill({ json: currentUser })
      return
    }
    if (url.pathname === "/api/v1/users/") {
      await route.fulfill({ json: { data: [currentUser], count: 1 } })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/organizations/invitations", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.route("**/api/v1/v2/agents**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/v1/v2/agents") {
      await route.fulfill({
        json: { items: options.empty ? [] : agents },
      })
      return
    }
    if (url.pathname === "/api/v1/v2/agents/jensen") {
      await route.fulfill({ json: jensenDetail })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/v2/metrics**", async (route) => {
    await route.fulfill({ json: { metrics: {} } })
  })

  await mockV2Documents(page)
}

test("agents grid links to specialist detail and session metrics", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/agents")

  await expect(
    page.getByRole("heading", { name: /Reusable .*specialists/i }),
  ).toBeVisible()
  await expect(page.getByTestId("agents-grid")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 3 }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Mira", level: 3 }),
  ).toBeVisible()

  await page
    .getByRole("link", { name: /open specialist jensen/i })
    .click()
  await expect(page).toHaveURL(/\/v2\/agents\/jensen$/)
  await expect(page.getByRole("heading", { name: "Jensen" })).toBeVisible()
  await expect(page.getByText("Operating instructions")).toBeVisible()

  const linkedKnowledge = page.getByRole("link", {
    name: /Stripe webhook idempotency strategy/,
  })
  await expect(linkedKnowledge).toHaveAttribute(
    "href",
    "/v2/library/doc-1#decision-wal-table",
  )

  await page
    .getByRole("link", {
      name: /Stripe is double-charging some users on plan upgrades/,
    })
    .click()
  await expect(page).toHaveURL(/\/v2\/metrics\?session_id=session-1$/)
})

test("agents grid shows empty state before specialists are seeded", async ({
  page,
}) => {
  await mockAgentsShell(page, { empty: true })

  await page.goto("/v2/agents")

  await expect(
    page.getByRole("heading", { name: "No specialists yet" }),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Agents will appear here after Taskforce packages reusable specialist knowledge",
    ),
  ).toBeVisible()
})
