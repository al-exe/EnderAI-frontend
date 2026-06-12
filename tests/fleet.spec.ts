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

async function mockTaskforceAuth(page: Page) {
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
}

test("Fleet tab shows live sessions and links to agent setup", async ({
  page,
}) => {
  await mockTaskforceAuth(page)

  await page.goto("/v2/fleet")

  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Fleet" })).toHaveAttribute(
    "data-active",
    "true",
  )
  await expect(
    page.getByText("4 sessions · 7 instances · 4 running"),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", {
      name: "Stripe tax rollout — annual plans",
    }),
  ).toBeVisible()
  await expect(page.getByText("Needs review", { exact: true })).toBeVisible()
  await expect(page.getByText("Queued", { exact: true })).toBeVisible()

  await page.getByRole("link", { name: "+ New session" }).click()
  await expect(page).toHaveURL(/\/v2\/settings\?tab=connect-agent$/)
})
