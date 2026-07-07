import { expect, type Page, test } from "@playwright/test"

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

const organization = {
  id: "org-1",
  name: "Taskforce Labs",
  auto_evolve_enabled: true,
  created_at: "2026-03-24T00:00:00Z",
  updated_at: "2026-03-24T00:00:00Z",
  organization_role: "admin",
  members: [
    {
      id: "user-1",
      email: "alex@example.com",
      full_name: "Alex Lee",
      organization_role: "admin",
    },
  ],
  invitations: [],
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
    created_at: "2026-05-20T12:00:00Z",
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
    created_at: "2026-04-01T12:00:00Z",
  },
  {
    id: "agent-3",
    slug: "vega",
    name: "Vega",
    role: "Infrastructure Specialist",
    short_description: "Deploy pipelines and runtime health checks.",
    domain_tags: ["Infra", "Deploy"],
    status: "active",
    created_from: "seeded",
    linked_docs_count: 1,
    invocations_count: 8,
    tokens_saved: 8000,
    last_invoked_at: "2026-06-01T12:00:00Z",
    created_at: "2026-06-01T12:00:00Z",
  },
  {
    id: "agent-4",
    slug: "orion",
    name: "Orion",
    role: "Observability Specialist",
    short_description: "Metrics drift, alert noise, and dashboard hygiene.",
    domain_tags: ["Metrics", "Observability"],
    status: "proposed",
    created_from: "earned",
    linked_docs_count: 0,
    invocations_count: 0,
    tokens_saved: 0,
    last_invoked_at: null,
    created_at: "2026-06-15T12:00:00Z",
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
  model_hint: "inherit",
  permission_scope: "readonly",
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

const pickerDocuments = [
  {
    id: "doc-1",
    owner_id: "user-1",
    organization_id: null,
    folder_id: null,
    folder_name: "Billing",
    visibility: "private",
    user_access: "owner",
    is_favorite: true,
    title: "Stripe webhook idempotency strategy",
    description: "Decision record for route-boundary WAL dedupe.",
    human_summary: "Use route-boundary WAL dedupe for webhook retries.",
    ai_generated_summary: "Webhook idempotency strategy.",
    collaborators: ["Alex Lee"],
    shared_with: [],
    main_body: [{ segments: [{ text: "Use route-boundary WAL dedupe." }] }],
    details_file_name: "stripe-webhook-idempotency-strategy.details.md",
    details_markdown_sections: [],
    is_demo: false,
    created_at: "2026-05-20T12:00:00Z",
    updated_at: "2026-05-20T12:00:00Z",
  },
  {
    id: "doc-2",
    owner_id: "user-1",
    organization_id: null,
    folder_id: null,
    folder_name: "Billing",
    visibility: "private",
    user_access: "owner",
    is_favorite: true,
    title: "Refund idempotency notes",
    description: "Manual refund retry contract for billing agents.",
    human_summary: "Key refunds by charge_id so retries no-op.",
    ai_generated_summary: "Refund idempotency details.",
    collaborators: ["Alex Lee"],
    shared_with: [],
    main_body: [{ segments: [{ text: "Key refunds by charge_id." }] }],
    details_file_name: "refund-idempotency-notes.details.md",
    details_markdown_sections: [],
    is_demo: false,
    created_at: "2026-05-21T12:00:00Z",
    updated_at: "2026-05-21T12:00:00Z",
  },
]

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockAgentsShell(page: Page, options: { empty?: boolean } = {}) {
  let agentItems = agents.map((agent) => ({ ...agent }))
  let detail = { ...jensenDetail }
  let organizationState = { ...organization }

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

  await page.route("**/api/v1/organizations/me", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON()
      organizationState = { ...organizationState, ...body }
    }
    await route.fulfill({ json: organizationState })
  })

  await page.route("**/api/v1/v2/agents**", async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === "/api/v1/v2/agents") {
      await route.fulfill({
        json: { items: options.empty ? [] : agentItems },
      })
      return
    }
    if (url.pathname === "/api/v1/v2/agents/jensen/documents") {
      if (method === "POST") {
        const body = route.request().postDataJSON()
        const document = pickerDocuments.find(
          (item) => item.id === body.document_id,
        )
        if (document) {
          const linked = detail.linked_knowledge.some(
            (item) => item.document_id === document.id,
          )
          if (!linked) {
            detail = {
              ...detail,
              linked_knowledge: [
                ...detail.linked_knowledge,
                {
                  document_id: document.id,
                  title: document.title,
                  description: document.description,
                  anchor_id: null,
                  href: `/v2/library/${document.id}`,
                  reason: "added by Alex Lee",
                },
              ],
              stats: {
                ...detail.stats,
                linked_docs_count: detail.linked_knowledge.length + 1,
              },
            }
          }
        }
        await route.fulfill({ json: detail })
        return
      }
    }
    if (
      url.pathname === "/api/v1/v2/agents/jensen/sync-harness" &&
      method === "POST"
    ) {
      await route.fulfill({
        json: {
          priority: ["claude", "codex", "cursor"],
          files: [
            {
              target: "claude",
              path: ".claude/agents/jensen.md",
              content: "---\nname: jensen\n---\n",
              sha256: "a".repeat(64),
            },
            {
              target: "codex",
              path: ".codex/agents/jensen.md",
              content: "---\nname: jensen\n---\n",
              sha256: "a".repeat(64),
            },
            {
              target: "cursor",
              path: ".cursor/agents/jensen.md",
              content: "---\nname: jensen\n---\n",
              sha256: "a".repeat(64),
            },
          ],
        },
      })
      return
    }
    const unlinkMatch = url.pathname.match(
      /^\/api\/v1\/v2\/agents\/jensen\/documents\/([^/]+)$/,
    )
    if (unlinkMatch && method === "DELETE") {
      detail = {
        ...detail,
        linked_knowledge: detail.linked_knowledge.filter(
          (item) => item.document_id !== unlinkMatch[1],
        ),
      }
      await route.fulfill({ json: detail })
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
    const agentSlugMatch = url.pathname.match(
      /^\/api\/v1\/v2\/agents\/([^/]+)$/,
    )
    if (agentSlugMatch) {
      const slug = agentSlugMatch[1]
      const agent = agentItems.find((item) => item.slug === slug)
      if (!agent) {
        await route.fulfill({ status: 404, json: { detail: "Not found" } })
        return
      }
      if (method === "PATCH") {
        const body = route.request().postDataJSON()
        agentItems = agentItems.map((item) =>
          item.slug === slug ? { ...item, ...body } : item,
        )
        await route.fulfill({
          json: { ...jensenDetail, ...agent, ...body, slug },
        })
        return
      }
      await route.fulfill({ json: { ...jensenDetail, ...agent, slug } })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/v2/metrics**", async (route) => {
    await route.fulfill({ json: { metrics: {} } })
  })

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    if (
      url.pathname === "/api/v1/v2/documents/" &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        json: { data: pickerDocuments, count: pickerDocuments.length },
      })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
}

test("direct specialist URL renders detail instead of the agents grid", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles/jensen")

  await expect(page).toHaveURL(/\/v2\/profiles\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Operating instructions")).toBeVisible()
  await expect(page.getByTestId("agent-status-active")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toHaveCount(0)
})

test("legacy agents URLs redirect to the canonical profiles routes", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/agents")
  await expect(page).toHaveURL(/\/v2\/profiles$/)

  await page.goto("/v2/agents/jensen")
  await expect(page).toHaveURL(/\/v2\/profiles\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
})

test("hard refresh on /v2/profiles/ keeps Profiles selected and renders content", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles/")
  await page.reload()

  await expect(page.getByRole("link", { name: "Profiles" })).toHaveAttribute(
    "data-active",
    "true",
  )
  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toBeVisible()
})

test("profiles grid sorts by creation date", async ({ page }) => {
  await mockAgentsShell(page)
  await page.goto("/v2/profiles")

  const grid = page.getByTestId("agents-card-grid")
  const profileOrder = () =>
    grid
      .getByRole("link")
      .evaluateAll((links) =>
        links.map(
          (link) =>
            link.getAttribute("aria-label")?.replace("Open profile ", "") ?? "",
        ),
      )

  await expect(grid).toBeVisible()
  await expect.poll(profileOrder).toEqual(["Vega", "Jensen", "Mira"])
})

test("agent detail navigation does not flash no-access or not-found", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.route("**/api/v1/v2/agents/jensen", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({ json: jensenDetail })
  })

  await page.goto("/v2/profiles")
  await page.getByRole("link", { name: /open profile jensen/i }).click()

  await expect(page).toHaveURL(/\/v2\/profiles\/jensen$/)
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
  await page.goto("/v2/profiles")
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

  await page.goto("/v2/profiles")

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

  await page.goto("/v2/profiles")

  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toBeVisible()
  await expect(page.getByTestId("agents-card-grid")).toBeVisible()
  await expect(page.getByTestId("candidate-profiles-section")).toBeVisible()
  await expect(page.getByText("Orion", { exact: true })).toBeVisible()
  await expect(page.getByText("Jensen", { exact: true })).toBeVisible()
  await expect(page.getByText("Mira", { exact: true })).toBeVisible()
  await expect(page.getByTestId("agent-status-active").first()).toBeVisible()
  await expect(page.getByTestId("agent-status-archived")).toBeVisible()

  await page.getByRole("link", { name: /open profile jensen/i }).click()
  await expect(page).toHaveURL(/\/v2\/profiles\/jensen$/)
  await expect(
    page.getByRole("heading", { name: "Jensen", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Operating instructions")).toBeVisible()
  const metricsLink = page.getByRole("link", {
    name: /open metrics for "stripe is double-charging some users/i,
  })
  await expect(metricsLink).toHaveAttribute(
    "href",
    "/v2/metrics?session_id=session-1",
  )

  const linkedKnowledge = page.getByRole("link", {
    name: /Stripe webhook idempotency strategy/,
  })
  await expect(linkedKnowledge).toHaveAttribute(
    "href",
    "/v2/library/doc-1#decision-wal-table",
  )

  await metricsLink.click()
  await expect(page).toHaveURL(/\/v2\/metrics\?session_id=session-1$/)
})

test("profile lifecycle updates detail and list", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles/jensen")
  await expect(page.getByTestId("agent-status-active")).toBeVisible()

  await page.getByRole("button", { name: "Edit" }).click()
  await page.getByLabel("Status").click()
  await page.getByRole("option", { name: "Archived" }).click()
  await page.getByLabel("Model").fill("sonnet")
  await page.getByLabel("Permission scope").click()
  await page.getByRole("option", { name: "Full" }).click()
  await page.getByLabel("Routing triggers").fill("stripe\nwebhook\nrefunds")
  await page.getByLabel("Negative triggers").fill("pricing page copy")
  await page
    .getByLabel("Instructions")
    .fill("Verify webhook signatures.\nNever trust unverified events.")

  const updateResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen") &&
      response.request().method() === "PATCH",
  )
  await page.getByRole("button", { name: "Save" }).click()
  expect(
    await updateResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({
    status: "archived",
    model_hint: "sonnet",
    permission_scope: "full",
    routing_triggers: ["stripe", "webhook", "refunds"],
    negative_triggers: ["pricing page copy"],
    instructions: [
      "Verify webhook signatures.",
      "Never trust unverified events.",
    ],
  })
  await expect(page.getByTestId("agent-status-archived")).toBeVisible()
  await expect(page.getByTestId("agent-model-hint")).toHaveText("sonnet")
  await expect(page.getByTestId("agent-permission-scope")).toHaveText("full")
  await expect(
    page.getByTestId("agent-context").getByText("refunds"),
  ).toBeVisible()
  await expect(
    page
      .getByTestId("agent-instructions")
      .getByText("Never trust unverified events."),
  ).toBeVisible()

  await page
    .getByTestId("agent-detail-sticky-header")
    .getByRole("link", { name: "Profiles" })
    .click()
  await expect(
    page.getByRole("link", { name: /open profile jensen/i }),
  ).toBeVisible()
  await expect(
    page
      .getByRole("link", { name: /open profile jensen/i })
      .getByTestId("agent-status-archived"),
  ).toBeVisible()
})

test("profile documents can be pinned and removed", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles/jensen")
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Stripe webhook idempotency strategy" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Add documents" }).click()
  const addDialog = page.getByRole("dialog", { name: "Add documents" })
  await addDialog.getByLabel("Search documents").fill("refund")
  await addDialog
    .getByRole("button", { name: /Refund idempotency notes/ })
    .click()

  const addResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen/documents") &&
      response.request().method() === "POST",
  )
  await addDialog.getByRole("button", { name: "Add 1" }).click()
  expect(
    await addResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ document_id: "doc-2" })
  await expect(
    page.getByRole("link", { name: "Refund idempotency notes" }),
  ).toBeVisible()

  const removeResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen/documents/doc-2") &&
      response.request().method() === "DELETE",
  )
  await page
    .getByRole("row", { name: /Refund idempotency notes/ })
    .getByRole("button", { name: "Remove" })
    .click()
  await removeResponse
  await expect(
    page.getByRole("link", { name: "Refund idempotency notes" }),
  ).toHaveCount(0)
})

test("profile detail can prepare harness sync", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles/jensen")

  const syncResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen/sync-harness") &&
      response.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Sync to harness" }).click()
  await syncResponse

  await expect(
    page.getByText("Harness sync prepared for 3 files."),
  ).toBeVisible()
})

test("profiles grid shows empty state before profiles are seeded", async ({
  page,
}) => {
  await mockAgentsShell(page, { empty: true })

  await page.goto("/v2/profiles")

  await expect(
    page.getByRole("heading", { name: "No profiles yet." }),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Taskforce will create profiles automatically for you as you go.",
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

  await page.goto("/v2/profiles")

  await expect(page.getByTestId("profiles-load-error")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "No profiles yet." }),
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

  await page.goto("/v2/profiles/jensen")

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

test("profiles header exposes auto-evolve toggle for org admins", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles")

  await page.getByTestId("profiles-page-menu-trigger").click()
  const toggle = page.getByTestId("profiles-auto-evolve-toggle")
  await expect(toggle).toHaveAttribute("aria-checked", "true")

  const patchResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/organizations/me") &&
      response.request().method() === "PATCH",
  )
  await toggle.click()
  expect(
    await patchResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ auto_evolve_enabled: false })
  await expect(toggle).toHaveAttribute("aria-checked", "false")
})

test("candidate profiles approve and dismiss update the grids", async ({
  page,
}) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles")

  await expect(page.getByTestId("candidate-profiles-section")).toBeVisible()
  await expect(page.getByTestId("candidate-profile-orion")).toBeVisible()
  await expect(
    page.getByTestId("agents-card-grid").getByText("Orion", { exact: true }),
  ).toHaveCount(0)

  const approveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/orion") &&
      response.request().method() === "PATCH",
  )
  await page.getByTestId("candidate-approve-orion").click()
  expect(
    await approveResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ status: "active" })

  await expect(page.getByTestId("candidate-profile-orion")).toHaveCount(0)
  await expect(
    page.getByTestId("agents-card-grid").getByRole("link", {
      name: /open profile orion/i,
    }),
  ).toBeVisible()
  await expect(page.getByTestId("agent-status-active")).toHaveCount(3)
})

test("candidate profile dismiss archives the profile", async ({ page }) => {
  await mockAgentsShell(page)

  await page.goto("/v2/profiles")

  const dismissResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/orion") &&
      response.request().method() === "PATCH",
  )
  await page.getByTestId("candidate-dismiss-orion").click()
  expect(
    await dismissResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ status: "archived" })

  await expect(page.getByTestId("candidate-profile-orion")).toHaveCount(0)
  await expect(
    page
      .getByTestId("agents-card-grid")
      .getByRole("link", { name: /open profile orion/i })
      .getByTestId("agent-status-archived"),
  ).toBeVisible()
})
