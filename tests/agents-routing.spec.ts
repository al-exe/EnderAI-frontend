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
    created_from: "earned",
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
    status: "archived",
    created_from: "seeded",
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
  status: "active",
  short_description:
    "Stripe webhooks, subscriptions, and double-charge prevention.",
  created_from: "earned",
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
  let agentItems = agents.map((agent) => ({ ...agent }))
  let detail = { ...jensenDetail }

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
        json: { items: options.empty ? [] : agentItems },
      })
      return
    }
    if (url.pathname === "/api/v1/v2/agents/jensen") {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON()
        detail = { ...detail, ...body }
        agentItems = agentItems.map((agent) =>
          agent.slug === "jensen" ? { ...agent, ...body } : agent,
        )
      }
      await route.fulfill({ json: detail })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/v2/metrics**", async (route) => {
    await route.fulfill({ json: { metrics: {} } })
  })

  await mockV2Documents(page)
}

test("direct specialist URL renders detail instead of the agents grid", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/agents/jensen")

  await expect(page).toHaveURL(/\/v2\/agents\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Operating instructions")).toBeVisible()
  await expect(page.getByTestId("agent-status-active")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toHaveCount(0)
})

test("agent detail navigation does not flash no-access or not-found", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.route("**/api/v1/v2/agents/jensen", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({ json: jensenDetail })
  })

  await page.goto("/v2/agents")
  await page.getByRole("link", { name: /open profile jensen/i }).click()

  await expect(page).toHaveURL(/\/v2\/agents\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "No access", exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Specialist not found", exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
})

test("v2 route transient session errors do not render membership no-access", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "transient session read failure" },
    })
  })

  const userResponse = page.waitForResponse("**/api/v1/users/me")
  await page.goto("/v2/agents")
  await userResponse

  await expect(
    page.getByRole("heading", { name: "No access", exact: true }),
  ).toHaveCount(0)
  await expect(page.getByRole("link", { name: "View membership" })).toHaveCount(
    0,
  )
})

test("v2 route invalid session redirects to login instead of membership no-access", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "expired-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 403,
      json: { detail: "Could not validate credentials" },
    })
  })

  await page.goto("/v2/agents")

  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole("heading", { name: "No access", exact: true }),
  ).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("access_token")))
    .toBeNull()
})

test("profiles grid links to detail and session metrics", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/agents")

  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toBeVisible()
  await expect(page.getByTestId("agents-card-grid")).toBeVisible()
  await expect(page.getByText("Jensen", { exact: true })).toBeVisible()
  await expect(page.getByText("Mira", { exact: true })).toBeVisible()
  await expect(page.getByTestId("agent-status-active")).toBeVisible()
  await expect(page.getByTestId("agent-status-archived")).toBeVisible()

  await page.getByRole("link", { name: /open profile jensen/i }).click()
  await expect(page).toHaveURL(/\/v2\/agents\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Operating instructions")).toBeVisible()
  await expect(
    page.getByRole("link", {
      name: /open session "stripe is double-charging some users/i,
    }),
  ).toHaveAttribute("href", "/v2/ledger?session_id=session-1")

  const linkedKnowledge = page.getByRole("link", {
    name: /Stripe webhook idempotency strategy/,
  })
  await expect(linkedKnowledge).toHaveAttribute(
    "href",
    "/v2/library/doc-1#decision-wal-table",
  )

  await page
    .getByRole("link", {
      name: /open metrics for "stripe is double-charging some users/i,
    })
    .click()
  await expect(page).toHaveURL(/\/v2\/metrics\?session_id=session-1$/)
})

test("profile lifecycle updates detail and list filters", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/agents/jensen")
  await expect(page.getByTestId("agent-status-active")).toBeVisible()

  await page.getByRole("button", { name: "Edit" }).click()
  await page.getByLabel("Status").click()
  await page.getByRole("option", { name: "Archived" }).click()

  const updateResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen") &&
      response.request().method() === "PATCH",
  )
  await page.getByRole("button", { name: "Save" }).click()
  expect(
    await updateResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ status: "archived" })
  await expect(page.getByTestId("agent-status-archived")).toBeVisible()

  await page
    .getByTestId("agent-detail-sticky-header")
    .getByRole("link", { name: "Profiles" })
    .click()
  await page.getByRole("button", { name: /^Archived/ }).click()
  await expect(
    page.getByRole("link", { name: /open profile jensen/i }),
  ).toBeVisible()
  await page.getByRole("button", { name: /^Active/ }).click()
  await expect(
    page.getByRole("link", { name: /open profile jensen/i }),
  ).toHaveCount(0)
})

test("profiles grid shows empty state before profiles are seeded", async ({
  page,
}) => {
  await mockAgentsShell(page, { empty: true })

  await page.goto("/v2/agents")

  await expect(
    page.getByRole("heading", { name: "No profiles yet" }),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Agents will appear here after Taskforce packages reusable profile knowledge",
    ),
  ).toBeVisible()
})

test("profiles list exposes a retry state instead of an empty state", async ({
  page,
}) => {
  await mockAgentsShell(page)
  let attempts = 0

  await page.route("**/api/v1/v2/agents**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== "/api/v1/v2/agents") {
      await route.fallback()
      return
    }

    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 500,
        json: { detail: "Profiles temporarily unavailable" },
      })
      return
    }

    await route.fulfill({ json: { items: agents } })
  })

  await page.goto("/v2/agents")

  await expect(page.getByTestId("profiles-load-error")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "No profiles yet" }),
  ).toHaveCount(0)

  await page.getByTestId("profiles-load-error").getByRole("button").click()

  await expect(page.getByTestId("agents-card-grid")).toBeVisible()
  expect(attempts).toBe(2)
})

test("profile detail exposes a retry state instead of not found", async ({
  page,
}) => {
  await mockAgentsShell(page)
  let attempts = 0

  await page.route("**/api/v1/v2/agents/jensen", async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 500,
        json: { detail: "Profile temporarily unavailable" },
      })
      return
    }

    await route.fulfill({ json: jensenDetail })
  })

  await page.goto("/v2/agents/jensen")

  await expect(page.getByTestId("profile-detail-load-error")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Profile not found" }),
  ).toHaveCount(0)

  await page
    .getByTestId("profile-detail-load-error")
    .getByRole("button")
    .click()

  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
  expect(attempts).toBe(2)
})
