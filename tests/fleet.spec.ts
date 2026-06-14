import { expect, type Page, test } from "@playwright/test"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
  v2: true,
  subscription_tier: "free",
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockFleet(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/v1/users/me") {
      await route.fulfill({ json: currentUser })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/v2/taskforce/fleet", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: {
          id: "fleet-2",
          name: "",
          created_at: "2026-06-12T10:30:00Z",
          updated_at: "2026-06-12T10:30:00Z",
          agents: [],
        },
      })
      return
    }

    await route.fulfill({
      json: {
        fleet_sessions: [
          {
            id: "fleet-1",
            name: "stripe-checkout",
            created_at: "2026-06-12T10:00:00Z",
            updated_at: "2026-06-12T10:20:00Z",
            agents: [
              {
                session_id: "session-1",
                fleet_session_id: "fleet-1",
                cwd: "/workspace/billing",
                branch: "feature/automatic-tax",
                repo: "billing",
                active_document_id: "doc-1",
                referenced_document_ids: ["doc-2"],
                title: "Stripe checkout wiring",
                summary_markdown:
                  "Wiring automatic tax onto the subscription create path",
                last_seen_at: "2026-06-12T10:20:00Z",
                minutes_ago: 1,
                specialist_slug: "billing",
                model_id: "claude-opus-4-8",
              },
            ],
          },
        ],
      },
    })
  })

  await page.route("**/api/v1/v2/taskforce/session-log**", async (route) => {
    await route.fulfill({
      json: {
        session_id: "session-1",
        entries: [
          {
            document_id: "doc-1",
            title: "Stripe checkout wiring",
            score: 0.9,
            confidence_band: "high",
            match_reasons: [],
            summary_markdown: "Automatic tax wiring",
            occurred_at: "2026-06-12T10:18:00Z",
            query_id: "q-1",
            net_saved_tokens: 1200,
          },
        ],
      },
    })
  })

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    await route.fulfill({
      json: {
        id: "doc-2",
        title: "Payments — error taxonomy",
        content_markdown: "",
      },
    })
  })
}

test("Fleet renders the calm roster from live API data", async ({ page }) => {
  await mockFleet(page)
  await page.goto("/v2/fleet")

  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible()
  await expect(page.getByText("stripe-checkout")).toBeVisible()
  await expect(page.getByText("Opus 4.8")).toBeVisible()
  await expect(
    page.getByText("Wiring automatic tax onto the subscription create path"),
  ).toBeVisible()
  // Calm summary line — agents · running · fleets, no spend/token metrics.
  await expect(page.getByText("1 agent · 1 running · 1 fleet")).toBeVisible()

  // The rejected metrics direction must not reappear.
  await expect(page.getByText(/tokens/i)).toHaveCount(0)
  await expect(page.getByText(/saved by reuse/i)).toHaveCount(0)

  // New fleet creates a nameless fleet (no request body).
  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/v1/v2/taskforce/fleet") &&
      request.method() === "POST",
  )
  await page.getByRole("button", { name: "New fleet" }).click()
  expect((await createRequest).postDataJSON()).toEqual({})
})

test("clicking an agent row opens the session detail and back returns", async ({
  page,
}) => {
  await mockFleet(page)
  await page.goto("/v2/fleet")

  await page.getByText("Stripe checkout wiring").first().click()

  await expect(page).toHaveURL(/\/v2\/fleet\/session-1$/)
  await expect(
    page.getByRole("heading", { name: "Stripe checkout wiring" }),
  ).toBeVisible()
  await expect(page.getByText("Working on")).toBeVisible()
  await expect(page.getByText("Activity")).toBeVisible()
  await expect(page.getByText("Session", { exact: true })).toBeVisible()

  // Breadcrumb returns to the roster.
  await page.getByRole("link", { name: "Fleet" }).first().click()
  await expect(page).toHaveURL(/\/v2\/fleet$/)
  await expect(page.getByText("stripe-checkout")).toBeVisible()
})
