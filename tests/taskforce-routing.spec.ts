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

async function mockAuth(page: Page) {
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

for (const path of ["/", "/home", "/topics", "/cases", "/v2/home"]) {
  test(`${path} routes authenticated users to Taskforce Library`, async ({
    page,
  }) => {
    await mockAuth(page)

    await page.goto(path)

    await expect(page).toHaveURL(/\/v2\/library$/)
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Topics" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Cases" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Skills" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Search" })).toHaveCount(0)
    await expect(page.getByTestId("v2-mode-switch")).toHaveCount(0)
  })
}

test("/skills routes authenticated users to Profiles", async ({ page }) => {
  await mockAuth(page)

  await page.goto("/skills")

  await expect(page).toHaveURL(/\/v2\/agents$/)
  await expect(
    page.getByRole("heading", { name: "Profiles", level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Skills" })).toHaveCount(0)
})

test("disabled Search route redirects to Library and stays out of the sidebar", async ({
  page,
}) => {
  await mockAuth(page)

  await page.goto("/v2/search")

  await expect(page).toHaveURL(/\/v2\/library$/)
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Search" })).toHaveCount(0)
})

test("legacy settings route redirects into the Taskforce shell", async ({
  page,
}) => {
  await mockAuth(page)

  await page.goto("/settings?tab=connect-agent")

  await expect(page).toHaveURL(/\/v2\/settings\?tab=connect-agent$/)
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("tab", { name: "Connect agent" }),
  ).toHaveAttribute("aria-selected", "true")
})

test("hard refresh on /v2/library/ keeps Library selected and renders content", async ({
  page,
}) => {
  await mockAuth(page)

  await page.goto("/v2/library/")
  await page.reload()

  await expect(page.getByRole("link", { name: "Library" })).toHaveAttribute(
    "data-active",
    "true",
  )
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
})
