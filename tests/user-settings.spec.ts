import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { createUser } from "./utils/privateApi.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"

const tabs = ["My profile", "Connect Agent", "Password", "Danger zone"]

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

test("Connect Agent can generate Codex and generic MCP setup snippets", async ({
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
      data: [createdCredential],
      count: 1,
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
  await page.getByRole("tab", { name: "Connect Agent" }).click()
  await expect(page.getByLabel("Credential label")).toBeVisible()

  await page.getByLabel("Credential label").fill("Codex laptop")
  await page.getByTestId("create-agent-credential").click()

  await expect(page.getByText("Agent credential created")).toBeVisible()
  await expect(page.getByText("Token value to enter")).toBeVisible()
  await expect(page.getByTestId("connect-agent-token")).toContainText(
    "mcp-token-abc",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "enderai_mcp_token",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "enderai_backend_token",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "backend-token-123",
  )
  await expect(page.getByTestId("connect-agent-token")).toContainText(
    "mcp-token-abc",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "export ENDERAI_BACKEND_TOKEN",
  )
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    '"inputs"',
  )
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    `Bearer ${"$"}{input:enderai_mcp_token}`,
  )
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    '"id": "enderai_backend_token"',
  )
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    `${"$"}{input:enderai_backend_token}`,
  )

  await page.getByRole("tab", { name: "Codex CLI" }).click()

  await expect(
    page.getByText(
      "If you want new terminals to pick up the token automatically, use the persistent shell setup below instead of re-running `export` each time.",
    ),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-token")).toContainText(
    "ENDERAI_MCP_TOKEN",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "ENDERAI_BACKEND_TOKEN",
  )
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  )
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    "X-EnderAI-Backend-Token",
  )
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("chmod 600 ~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText('echo \'export ENDERAI_MCP_TOKEN=')
  await expect(
    page.getByText("Why use the file-based shell setup"),
  ).toBeVisible()
  await expect(
    page.getByText(
      "Directly writing `export ENDERAI_MCP_TOKEN=\"...\"` into `~/.bashrc` also works",
    ),
  ).toBeVisible()

  await page.getByRole("tab", { name: "Generic MCP client" }).click()

  await expect(page.getByTestId("connect-agent-token")).toContainText(
    "mcp-token-abc",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "enderai_mcp_token",
  )
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    `Bearer ${"$"}{input:enderai_mcp_token}`,
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_begin_case",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "auto-hydrate relevant prior context",
  )

  await page.getByRole("tab", { name: "Codex CLI" }).click()

  await expect(
    page.getByText(
      "If you want new terminals to pick up the token automatically, use the persistent shell setup below instead of re-running `export` each time.",
    ),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-token")).toContainText(
    "ENDERAI_MCP_TOKEN",
  )
  await expect(page.getByTestId("connect-agent-token")).not.toContainText(
    "ENDERAI_BACKEND_TOKEN",
  )
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  )
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    "X-EnderAI-Backend-Token",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_finish_case",
  )

  await page.reload()
  await page.getByRole("tab", { name: "Connect Agent" }).click()

  await expect(page.getByText("Rotate to reveal fresh tokens")).toBeVisible()
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_begin_case",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "enderai_finish_case",
  )
  await expect(page.getByTestId("connect-agent-token")).toHaveCount(0)
})
