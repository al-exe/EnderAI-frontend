import { expect, test } from "@playwright/test"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({ json: currentUser })
  })

  await page.route("**/api/v1/agent-credentials/", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })
})

test("Home page explains EnderAI and the product model", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByText("EnderAI is product memory for AI-assisted work."),
  ).toBeVisible()
  await expect(page.getByText("The product model")).toBeVisible()
  await expect(
    page.getByText(
      "EnderAI is organized around two user-facing objects. A third system object, the ContextPack, powers agent hydration behind the scenes.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Topics").first()).toBeVisible()
  await expect(page.getByText("Cases").first()).toBeVisible()
  await expect(page.getByText("ContextPacks")).toBeVisible()
  await expect(page.getByText("Search and demo mode")).toBeVisible()
  await expect(page.getByText("Open Settings -> Connect agent")).toBeVisible()
  await expect(page.getByText("enderai_begin_case").first()).toBeVisible()
  await expect(page.getByText("enderai_finish_case").first()).toBeVisible()
})

test("Connect agent CTA opens the settings tab directly", async ({ page }) => {
  await page.goto("/")

  await page.getByTestId("home-connect-agent-link").click()

  await expect(page).toHaveURL(/\/settings\?tab=connect-agent$/)
  await expect(
    page.getByRole("tab", { name: "Connect agent" }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(
    page.getByText(
      "Generate a per-user MCP token and the minimal EnderAI workflow snippet your agent needs.",
    ),
  ).toBeVisible()
})
