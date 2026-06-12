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
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    await route.fulfill({
      json: {
        fleet_sessions: [
          {
            id: "fleet-1",
            name: "Stripe tax rollout",
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
        unassigned: [],
      },
    })
  })
}

test("Fleet renders live API data in the clean session layout", async ({
  page,
}) => {
  await mockFleet(page)
  await page.goto("/v2/fleet")

  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Stripe tax rollout" }),
  ).toBeVisible()
  await expect(page.getByText("Opus 4.8")).toBeVisible()
  await expect(
    page.getByText("Wiring automatic tax onto the subscription create path"),
  ).toBeVisible()
  await expect(page.getByText("Stripe checkout wiring")).toBeVisible()
  await expect(
    page.getByText("1 session · 1 instance · 1 running"),
  ).toBeVisible()

  await page.getByRole("button", { name: "New fleet" }).click()
  await expect(
    page.getByRole("heading", { name: "New Fleet session" }),
  ).toBeVisible()
})
