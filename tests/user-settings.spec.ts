import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { createUser } from "./utils/privateApi.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"

const tabs = ["My profile", "Connect agent", "Password", "Danger zone"]

test("My profile tab is active by default", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByRole("tab", { name: "My profile" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
})

test("All tabs are visible", async ({ page }) => {
  await page.goto("/settings")
  for (const tab of tabs) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible()
  }
})

test.describe("Edit user profile", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  let email: string
  let password: string

  test.beforeAll(async () => {
    email = randomEmail()
    password = randomPassword()
    await createUser({ email, password })
  })

  test.beforeEach(async ({ page }) => {
    await logInUser(page, email, password)
    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()
  })

  test("Edit user name with a valid name", async ({ page }) => {
    const updatedName = "Test User 2"

    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Full name").fill(updatedName)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("User updated successfully")).toBeVisible()
    await expect(
      page.locator("form").getByText(updatedName, { exact: true }),
    ).toBeVisible()
  })

  test("Edit user email with an invalid email shows error", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill("")
    await page.locator("body").click()

    await expect(page.getByText("Invalid email address")).toBeVisible()
  })
})

test.describe("Edit user email", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Edit user email with a valid email", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const updatedEmail = randomEmail()

    await createUser({ email, password })
    await logInUser(page, email, password)
    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()

    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(updatedEmail)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("User updated successfully")).toBeVisible()
    await expect(
      page.locator("form").getByText(updatedEmail, { exact: true }),
    ).toBeVisible()
  })
})

test.describe("Cancel edit actions", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Cancel edit action restores original name", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const user = await createUser({ email, password })

    await logInUser(page, email, password)
    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Full name").fill("Test User")
    await page.getByRole("button", { name: "Cancel" }).first().click()

    await expect(
      page.locator("form").getByText(user.full_name as string, { exact: true }),
    ).toBeVisible()
  })

  test("Cancel edit action restores original email", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })

    await logInUser(page, email, password)
    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(randomEmail())
    await page.getByRole("button", { name: "Cancel" }).first().click()

    await expect(
      page.locator("form").getByText(email, { exact: true }),
    ).toBeVisible()
  })
})

test.describe("Change password", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Update password successfully", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const newPassword = randomPassword()

    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Password" }).click()
    await page.getByTestId("current-password-input").fill(password)
    await page.getByTestId("new-password-input").fill(newPassword)
    await page.getByTestId("confirm-password-input").fill(newPassword)
    await page.getByRole("button", { name: "Update Password" }).click()

    await expect(page.getByText("Password updated successfully")).toBeVisible()

    await logOutUser(page)
    await logInUser(page, email, newPassword)
  })
})

test.describe("Change password validation", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  let email: string
  let password: string

  test.beforeAll(async () => {
    email = randomEmail()
    password = randomPassword()
    await createUser({ email, password })
  })

  test.beforeEach(async ({ page }) => {
    await logInUser(page, email, password)
    await page.goto("/settings")
    await page.getByRole("tab", { name: "Password" }).click()
  })

  test("Update password with weak passwords", async ({ page }) => {
    const weakPassword = "weak"

    await page.getByTestId("current-password-input").fill(password)
    await page.getByTestId("new-password-input").fill(weakPassword)
    await page.getByTestId("confirm-password-input").fill(weakPassword)
    await page.getByRole("button", { name: "Update Password" }).click()

    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible()
  })

  test("New password and confirmation password do not match", async ({
    page,
  }) => {
    await page.getByTestId("current-password-input").fill(password)
    await page.getByTestId("new-password-input").fill(randomPassword())
    await page.getByTestId("confirm-password-input").fill(randomPassword())
    await page.getByRole("button", { name: "Update Password" }).click()

    await expect(page.getByText("The passwords don't match")).toBeVisible()
  })

  test("Current password and new password are the same", async ({ page }) => {
    await page.getByTestId("current-password-input").fill(password)
    await page.getByTestId("new-password-input").fill(password)
    await page.getByTestId("confirm-password-input").fill(password)
    await page.getByRole("button", { name: "Update Password" }).click()

    await expect(
      page.getByText("New password cannot be the same as the current one"),
    ).toBeVisible()
  })
})

test("Appearance button is visible in sidebar", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByTestId("theme-button")).toBeVisible()
})

test("User can switch between theme modes", async ({ page }) => {
  await page.goto("/settings")

  await page.getByTestId("theme-button").click()
  await page.getByTestId("dark-mode").click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await expect(page.getByTestId("dark-mode")).not.toBeVisible()

  await page.getByTestId("theme-button").click()
  await page.getByTestId("light-mode").click()
  await expect(page.locator("html")).toHaveClass(/light/)
})

test("Selected mode is preserved across sessions", async ({ page }) => {
  await page.goto("/settings")

  await page.getByTestId("theme-button").click()
  if (
    await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    )
  ) {
    await page.getByTestId("light-mode").click()
    await page.getByTestId("theme-button").click()
  }

  const isLightMode = await page.evaluate(() =>
    document.documentElement.classList.contains("light"),
  )
  expect(isLightMode).toBe(true)

  await page.getByTestId("theme-button").click()
  await page.getByTestId("dark-mode").click()
  let isDarkMode = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  )
  expect(isDarkMode).toBe(true)

  await logOutUser(page)
  await logInUser(page, firstSuperuser, firstSuperuserPassword)

  isDarkMode = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  )
  expect(isDarkMode).toBe(true)
})

test("Connect agent generates the hosted Codex setup and hides revoked credentials", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "frontend-test-token")
  })

  let credentials = {
    data: [],
    count: 0,
  } as {
    data: Array<{
      id: string
      user_id: string
      label: string
      created_at: string | null
      updated_at: string | null
      last_rotated_at: string | null
      current_token_expires_at: string | null
      last_used_at: string | null
      revoked_at: string | null
    }>
    count: number
  }
  const revokedCredential = {
    id: "agent-credential-revoked",
    user_id: "user-1",
    label: "Revoked install",
    created_at: "2026-03-13T20:00:00Z",
    updated_at: "2026-03-15T20:00:00Z",
    last_rotated_at: "2026-03-14T20:00:00Z",
    current_token_expires_at: "2027-03-14T20:00:00Z",
    last_used_at: null,
    revoked_at: "2026-03-15T20:00:00Z",
  }

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        email: "frontend-test@example.com",
        is_active: true,
        is_superuser: false,
        full_name: "Frontend Test User",
        created_at: "2026-03-14T20:00:00Z",
      }),
    })
  })

  await page.route("**/api/v1/agent-credentials/", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(credentials),
      })
      return
    }

    const createdCredential = {
      id: "agent-credential-1",
      user_id: "user-1",
      label: "Codex laptop",
      created_at: "2026-03-14T20:00:00Z",
      updated_at: "2026-03-14T20:00:00Z",
      last_rotated_at: "2026-03-14T20:00:00Z",
      current_token_expires_at: "2027-03-14T20:00:00Z",
      last_used_at: null,
      revoked_at: null,
    }

    credentials = {
      data: [createdCredential, revokedCredential],
      count: 2,
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        credential: createdCredential,
        mcp_access_token: "mcp-token-abc",
        token_type: "bearer",
      }),
    })
  })

  await page.route(
    "**/api/v1/agent-credentials/agent-credential-1/rotate",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          credential: credentials.data[0],
          mcp_access_token: "mcp-token-rotated",
          token_type: "bearer",
        }),
      })
    },
  )

  await page.route(
    "**/api/v1/agent-credentials/agent-credential-1",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Agent credential revoked successfully",
        }),
      })
    },
  )

  await page.goto("/settings")
  await page.getByRole("tab", { name: "Connect agent" }).click()
  await expect(
    page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: "Connect agent" }),
  ).toBeVisible()
  await expect(page.getByLabel("Credential label")).toBeVisible()
  await expect(page.getByLabel("Credential label")).toHaveValue("EnderAI token")
  await expect(page.getByText("Revoked install")).toHaveCount(0)
  await expect(
    page.getByText(
      "Generate an MCP token to get your agent connected to EnderAI.",
    ),
  ).toBeVisible()
  await expect(page.getByText("Hosted MCP URL")).toHaveCount(0)
  await expect(
    page.getByText("https://enderai-mcp.onrender.com/mcp"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("tab", { name: "Generic MCP client" }),
  ).toHaveCount(0)

  await page.getByLabel("Credential label").fill("Codex laptop")
  await page.getByTestId("create-agent-credential").click()

  await expect(page.getByText("Agent credential created")).toBeVisible()
  await expect(page.getByText("Where this goes")).toHaveCount(0)
  await expect(page.getByText("Export this env var")).toHaveCount(0)
  await expect(
    page.getByText(
      "Run the export snippet in the same shell that will launch terminal `codex`, then add the TOML block to `~/.codex/config.toml`.",
    ),
  ).toHaveCount(0)
  await expect(
    page.getByText("then launch `codex` from that same shell"),
  ).toHaveCount(0)
  await expect(
    page.getByText("Optional: persist the token across new terminals"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("tab", { name: "AI assisted setup" }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tab", { name: "Manual setup" })).toBeVisible()
  await expect(page.getByText("Leverage AI to complete setup")).toBeVisible()
  await expect(
    page.getByText(
      "Pass the following instructions to your AI of choice to help you complete setup.",
    ),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Persist the token",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    'export ENDERAI_MCP_TOKEN="mcp-token-abc"',
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Setup CLI config",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Add agent instruction",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "enderai_begin_case",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Start Codex",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "codex",
  )

  await page.getByRole("tab", { name: "Manual setup" }).click()
  await expect(
    page.getByText("Persist the token across new terminals"),
  ).toBeVisible()
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText('export ENDERAI_MCP_TOKEN="mcp-token-abc"')
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("chmod 600 ~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("echo 'export ENDERAI_MCP_TOKEN=")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).not.toContainText("ENDERAI_BACKEND_TOKEN")
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  )
  await expect(
    page.getByText("Add this block to `~/.codex/config.toml`."),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    "X-EnderAI-Backend-Token",
  )
  const persistStepTop = await page
    .getByText("Persist the token across new terminals")
    .boundingBox()
  const configStepTop = await page.getByText("Codex CLI config").boundingBox()
  expect(persistStepTop?.y).toBeLessThan(configStepTop?.y ?? 0)
  await expect(page.getByText("Start Codex from terminal")).toBeVisible()
  await expect(page.getByTestId("connect-agent-start-codex")).toContainText(
    "codex",
  )
  await expect(
    page.getByText("Why use the file-based shell setup"),
  ).toHaveCount(0)
  await expect(
    page.getByText(
      'Directly writing `export ENDERAI_MCP_TOKEN="..."` into `~/.bashrc` also works',
    ),
  ).toHaveCount(0)
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_begin_case",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "auto-hydrate relevant prior context",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_finish_case",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "Prefer the guided case tools over raw `enderai_request` calls.",
  )
  const instructionStepTop = await page
    .getByText("Minimal agent instruction")
    .boundingBox()
  const startStepTop = await page
    .getByText("Start Codex from terminal")
    .boundingBox()
  expect(configStepTop?.y).toBeLessThan(instructionStepTop?.y ?? 0)
  expect(instructionStepTop?.y).toBeLessThan(startStepTop?.y ?? 0)
  await expect(
    page.locator('[data-slot="card-title"]').filter({ hasText: "Credentials" }),
  ).toBeVisible()

  await page.reload()
  await page.getByRole("tab", { name: "Connect agent" }).click()

  await expect(
    page.getByText("Persist the token across new terminals"),
  ).toHaveCount(0)
  await expect(
    page.getByText('export ENDERAI_MCP_TOKEN="PASTE_MCP_TOKEN_HERE"'),
  ).toHaveCount(0)
  await expect(page.getByTestId("connect-agent-persistent-shell")).toHaveCount(
    0,
  )
  await expect(page.getByTestId("connect-agent-config")).toHaveCount(0)
  await expect(
    page.getByRole("tab", { name: "AI assisted setup" }),
  ).toHaveCount(0)
  await expect(page.getByRole("tab", { name: "Manual setup" })).toHaveCount(0)
  await expect(page.getByTestId("connect-agent-ai-setup")).toHaveCount(0)
  await expect(page.getByText("Start Codex from terminal")).toHaveCount(0)
  await expect(page.getByTestId("connect-agent-instructions")).toHaveCount(0)
  await expect(page.getByText("Minimal agent instruction")).toHaveCount(0)
  await expect(page.getByText("Leverage AI to complete setup")).toHaveCount(0)
  await expect(page.getByText("enderai_finish_case")).toHaveCount(0)
  await expect(page.getByText("enderai_begin_case")).toHaveCount(0)
  await expect(page.getByText("# Add agent instruction")).toHaveCount(0)
  await expect(page.getByText("# Start Codex")).toHaveCount(0)
  await expect(page.getByText("# Setup CLI config")).toHaveCount(0)
  await expect(page.getByText("Revoked install")).toHaveCount(0)
})
