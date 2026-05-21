import { expect, type Page, test } from "@playwright/test"

import { mockV2Documents } from "./fixtures/v2-documents"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
  v2: false,
  subscription_tier: "free",
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockAuthenticatedTaskforce(page: Page) {
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

  await mockV2Documents(page)
}

test("Landing page presents Taskforce V2 as the public product", async ({
  page,
}) => {
  await page.goto("/")

  await expect(page.getByTestId("taskforce-landing")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Taskforce", exact: true }),
  ).toBeVisible()
  await expect(page.getByText("AI work memory for builders")).toBeVisible()
  await expect(page.getByText("Library").first()).toBeVisible()
  await expect(page.getByText("Agents").first()).toBeVisible()
  await expect(page.getByText("Metrics").first()).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Log in", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Sign up", exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Browse Topics")).toHaveCount(0)
  await expect(page.getByText("Review Cases")).toHaveCount(0)
})

test("Signed-in root route opens Taskforce Library", async ({ page }) => {
  await mockAuthenticatedTaskforce(page)

  await page.goto("/")

  await expect(page).toHaveURL(/\/v2\/library$/)
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Topics" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Cases" })).toHaveCount(0)
})
