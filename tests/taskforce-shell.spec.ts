import { expect, type Page, test } from "@playwright/test"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
  v2: true,
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

    if (url.pathname === "/api/v1/users/") {
      await route.fulfill({ json: { data: [currentUser], count: 1 } })
      return
    }

    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
}

test("Taskforce v2 sidebar includes collapse and appearance controls", async ({
  page,
}) => {
  await mockTaskforceAuth(page)

  await page.goto("/v2/home")

  const collapseToggle = page.getByTestId("sidebar-collapse-toggle")
  const appearanceButton = page.getByTestId("theme-button")

  await expect(collapseToggle).toBeVisible()
  await expect(appearanceButton).toBeVisible()

  await collapseToggle.click()
  await expect(collapseToggle).toBeVisible()

  await appearanceButton.click()
  await expect(page.getByTestId("dark-mode")).toBeVisible()
})

test("Taskforce v2 Admin link stays inside the v2 shell", async ({ page }) => {
  await mockTaskforceAuth(page)

  await page.goto("/v2/home")
  await page.getByRole("link", { name: "Admin" }).click()

  await expect(page).toHaveURL(/\/v2\/admin$/)
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible()
  await expect(
    page.getByText("Manage user accounts and permissions"),
  ).toBeVisible()
  await expect(page.getByText("Taskforce").first()).toBeVisible()
})
