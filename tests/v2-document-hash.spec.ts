import { expect, type Page, test } from "@playwright/test"

import { mockV2Documents } from "./fixtures/v2-documents"

const bridgeDocumentId = "8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32"

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

async function mockTaskforceDocumentPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
    window.localStorage.setItem("taskforce-demo-mode", "true")

    const win = window as typeof window & { __scrollIntoViewCalls: string[] }
    win.__scrollIntoViewCalls = []
    Element.prototype.scrollIntoView = function () {
      win.__scrollIntoViewCalls.push((this as HTMLElement).id)
    }
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
    const method = route.request().method()

    if (url.pathname === "/api/v1/v2/agents" && method === "GET") {
      await route.fulfill({
        json: {
          items: [
            {
              id: "agent-1",
              slug: "jensen",
              name: "Jensen",
              role: "Billing Reliability Specialist",
              short_description: "Stripe webhooks and billing retries.",
              domain_tags: ["Stripe", "Billing"],
              status: "active",
              created_from: "earned",
              linked_docs_count: 1,
              invocations_count: 12,
              tokens_saved: 42000,
              last_invoked_at: "2026-05-24T12:00:00Z",
              created_at: "2026-05-20T12:00:00Z",
            },
          ],
        },
      })
      return
    }

    if (
      url.pathname === "/api/v1/v2/agents/jensen/documents" &&
      method === "POST"
    ) {
      await route.fulfill({
        json: {
          id: "agent-1",
          slug: "jensen",
          name: "Jensen",
          role: "Billing Reliability Specialist",
          status: "active",
          short_description: "Stripe webhooks and billing retries.",
          description: "Stripe webhooks and billing retries.",
          created_from: "earned",
          model_hint: "inherit",
          permission_scope: "readonly",
          domain_tags: ["Stripe", "Billing"],
          routing_triggers: ["stripe"],
          negative_triggers: [],
          instructions: [],
          linked_knowledge: [],
          recent_invocations: [],
          stats: {
            invocations_count: 12,
            linked_docs_count: 2,
            tokens_saved: 42000,
            usd_saved: "0.630000",
          },
        },
      })
      return
    }

    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await mockV2Documents(page)
}

test("V2 document viewer ignores URL hash anchors after evidence anchoring removal", async ({
  page,
}) => {
  await mockTaskforceDocumentPage(page)

  await page.goto(`/v2/library/${bridgeDocumentId}#affected-users`)

  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0)
  await expect(page.getByTestId("ai-evidence-affected-users")).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __scrollIntoViewCalls: string[] })
            .__scrollIntoViewCalls,
      ),
    )
    .toEqual([])
})

test("V2 document viewer leaves summary mode unchanged without URL hash", async ({
  page,
}) => {
  await mockTaskforceDocumentPage(page)

  await page.goto(`/v2/library/${bridgeDocumentId}`)

  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0)
  await expect(page.getByText("Sessions / Reused by")).toBeVisible()
  await expect(page.getByText("No sessions recorded yet")).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __scrollIntoViewCalls: string[] })
            .__scrollIntoViewCalls,
      ),
    )
    .toEqual([])
})

test("V2 document viewer ignores unknown URL hash anchors", async ({
  page,
}) => {
  await mockTaskforceDocumentPage(page)

  await page.goto(`/v2/library/${bridgeDocumentId}#unknown-anchor`)

  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __scrollIntoViewCalls: string[] })
            .__scrollIntoViewCalls,
      ),
    )
    .toEqual([])
})

test("V2 document can be added to an agent", async ({ page }) => {
  await mockTaskforceDocumentPage(page)

  await page.goto(`/v2/library/${bridgeDocumentId}`)
  await page.getByRole("button", { name: "Add to agent" }).click()
  await page.getByLabel("Search agents").fill("jensen")
  await page.getByRole("button", { name: /Jensen/ }).click()

  const addResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/v2/agents/jensen/documents?demo=true") &&
      response.request().method() === "POST",
  )
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add to agent" })
    .click()
  expect(
    await addResponse.then((response) => response.request().postDataJSON()),
  ).toMatchObject({ document_id: bridgeDocumentId })
})
