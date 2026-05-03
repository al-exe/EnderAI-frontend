import { expect, type Page, test } from "@playwright/test"

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

async function mockAuthenticatedHome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({ json: currentUser })
  })

  await page.route("**/api/v1/agent-credentials/", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })
}

test("Home page explains EnderAI and the domain memory model", async ({
  page,
}) => {
  await mockAuthenticatedHome(page)
  await page.goto("/home")

  await expect(
    page.getByText(
      "EnderAI turns messy team history into context agents can actually use.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Welcome back, Alex")).toBeVisible()
  await expect(
    page.getByText(
      "Work leaves useful traces in tickets, pull requests, docs, Slack threads, incidents, support notes, commands, and one-off decisions.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText("The missing part is the local story"),
  ).toBeVisible()
  await expect(
    page.getByText("Keep the useful parts of past work"),
  ).toBeVisible()
  await expect(
    page.getByText(
      "EnderAI is organized around two user-facing objects. A third system object, the ContextPack, powers agent hydration behind the scenes.",
    ),
  ).toHaveCount(0)
  await expect(page.getByText("Home docs")).toHaveCount(0)
  await expect(
    page.getByText(
      "Add this guidance to your agent instructions so meaningful work is captured consistently.",
    ),
  ).toHaveCount(0)
  await expect(page.getByText("Topics").first()).toBeVisible()
  await expect(page.getByText("Cases").first()).toBeVisible()
  await expect(page.getByText("Context Packs", { exact: true })).toBeVisible()
  await expect(page.getByText("ContextPacks")).toHaveCount(0)
  await expect(
    page.getByText(
      "Context Packs are the briefings EnderAI assembles before work starts.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Give agents enough background to stop guessing from scratch.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Search and demo mode")).toHaveCount(0)
  await expect(page.getByText("Browse Topics")).toBeVisible()
  await expect(page.getByText("Review Cases")).toBeVisible()
  await expect(
    page.getByText("Example: sensitive data correction"),
  ).toBeVisible()
  await expect(
    page.getByText("Correct an incorrectly imported sensitive customer field"),
  ).toBeVisible()
  await expect(page.getByText("Connect agent")).toBeVisible()
  await expect(page.getByText("enderai_begin_case").first()).toBeVisible()
})

test("Landing page is public and points inaccessible actions to auth", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByText(
      "EnderAI turns messy team history into context agents can actually use.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Try the demo").first()).toBeVisible()
  await expect(page.getByText("See how it works")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Log in", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Sign up", exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Welcome back, Alex")).toHaveCount(0)
  await expect(page.getByText("Log in to browse Topics")).toBeVisible()
  await expect(page.getByText("Log in to review Cases")).toBeVisible()
})

test("Connect agent CTA opens the settings tab directly", async ({ page }) => {
  await mockAuthenticatedHome(page)
  await page.goto("/home")

  await page.getByTestId("home-connect-agent-link").click()

  await expect(page).toHaveURL(/\/settings\?tab=connect-agent$/)
  await expect(
    page.getByRole("tab", { name: "Connect agent" }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(
    page.getByText("Token and config snippets for local MCP testing."),
  ).toBeVisible()
})
