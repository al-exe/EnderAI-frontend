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

test("Home page explains EnderAI and the product model", async ({ page }) => {
  await mockAuthenticatedHome(page)
  await page.goto("/home")

  await expect(
    page.getByText("EnderAI is product memory for AI-assisted work."),
  ).toBeVisible()
  await expect(page.getByText("Welcome back, Alex")).toBeVisible()
  await expect(
    page.getByText(
      "It gives agents a shared place to remember work done, commands run, decisions made, and outcomes reached so each new task can start with relevant context instead of rediscovery.",
    ),
  ).toBeVisible()
  await expect(page.getByText("The product model")).toBeVisible()
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
  await expect(page.getByText("Context Packs")).toBeVisible()
  await expect(page.getByText("ContextPacks")).toHaveCount(0)
  await expect(
    page.getByText(
      "A Context Pack is the synthesized briefing EnderAI builds for an agent at Case start.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Visible in Case detail and Topic context intelligence without becoming separate navigation.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Search and demo mode")).toHaveCount(0)
  await expect(page.getByText("Browse Topics")).toBeVisible()
  await expect(page.getByText("Review Cases")).toBeVisible()
  await expect(
    page.getByText("The agent starts meaningful work by starting a Case."),
  ).toBeVisible()
  await expect(page.getByText("Open Settings > Connect agent")).toBeVisible()
  await expect(
    page.getByText(
      "Open Settings, create an MCP credential, add the generated config to your client, then ask the agent to verify the connection with",
    ),
  ).toBeVisible()
  await expect(page.getByText("enderai_begin_case").first()).toBeVisible()
  await expect(page.getByText("enderai_finish_case").first()).toBeVisible()
})

test("Landing page is public and points inaccessible actions to auth", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByText("EnderAI is product memory for AI-assisted work."),
  ).toBeVisible()
  await expect(page.getByText("Use EnderAI now").first()).toBeVisible()
  await expect(page.getByText("Log in now")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Log in", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Sign up", exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Welcome back, Alex")).toHaveCount(0)
  await expect(page.getByText("Log in to browse Topics")).toBeVisible()
  await expect(page.getByText("Log in to review Cases")).toBeVisible()
  await expect(page.getByText("Log in to connect agent")).toBeVisible()
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
    page.getByText(
      "Generate an MCP token to get your agent connected to EnderAI.",
    ),
  ).toBeVisible()
})
