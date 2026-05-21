import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { createUser } from "./utils/privateApi.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"

const tabs = [
  "My profile",
  "Organization",
  "Connect agent",
  "Billing",
  "Password",
  "Danger zone",
]

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

test.describe("Organization", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Organization tab shows members, invitations, and admin actions", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("access_token", "frontend-test-token")
    })

    let organization = {
      id: "org-1",
      name: "Frontend Test Organization",
      created_at: "2026-03-14T20:00:00Z",
      updated_at: "2026-03-14T20:00:00Z",
      organization_role: "admin",
      members: [
        {
          id: "user-1",
          email: "admin@example.com",
          full_name: "Admin User",
          organization_role: "admin",
        },
        {
          id: "user-2",
          email: "member@example.com",
          full_name: "Member User",
          organization_role: "member",
        },
      ],
      invitations: [
        {
          id: "invite-1",
          organization_id: "org-1",
          organization_name: "Frontend Test Organization",
          invited_email: "pending@example.com",
          invited_by_user_id: "user-1",
          created_at: "2026-03-15T20:00:00Z",
          accepted_at: null,
          revoked_at: null,
        },
      ],
    }

    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          email: "admin@example.com",
          is_active: true,
          is_superuser: false,
          full_name: "Admin User",
          created_at: "2026-03-14T20:00:00Z",
        }),
      })
    })

    await page.route("**/api/v1/organizations/me", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = JSON.parse(route.request().postData() ?? "{}") as {
          name?: string
        }
        organization = {
          ...organization,
          name: body.name ?? organization.name,
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(organization),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(organization),
      })
    })

    await page.route("**/api/v1/organizations/invitations", async (route) => {
      if (route.request().method() === "POST") {
        const invite = {
          id: "invite-2",
          organization_id: "org-1",
          organization_name: "Frontend Test Organization",
          invited_email: "new@example.com",
          invited_by_user_id: "user-1",
          created_at: "2026-03-16T20:00:00Z",
          accepted_at: null,
          revoked_at: null,
        }
        organization = {
          ...organization,
          invitations: [...organization.invitations, invite],
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(invite),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "invite-incoming",
              organization_id: "org-2",
              organization_name: "Partner Organization",
              invited_email: "admin@example.com",
              invited_by_user_id: "partner-admin",
              created_at: "2026-03-17T20:00:00Z",
              accepted_at: null,
              revoked_at: null,
            },
          ],
          count: 1,
        }),
      })
    })

    await page.route(
      "**/api/v1/organizations/invitations/invite-incoming/accept",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...organization,
            id: "org-2",
            name: "Partner Organization",
            organization_role: "member",
          }),
        })
      },
    )

    await page.route(
      "**/api/v1/organizations/members/user-2",
      async (route) => {
        if (route.request().method() === "DELETE") {
          organization = {
            ...organization,
            members: organization.members.filter(
              (member) => member.id !== "user-2",
            ),
          }
          await route.fulfill({ status: 204 })
          return
        }

        organization = {
          ...organization,
          members: organization.members.map((member) =>
            member.id === "user-2"
              ? { ...member, organization_role: "admin" }
              : member,
          ),
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(organization.members[1]),
        })
      },
    )

    await page.goto("/settings?tab=organization")

    await expect(
      page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: "Organization" }),
    ).toBeVisible()
    await expect(page.getByText("Frontend Test Organization")).toBeVisible()
    await expect(page.getByText("Partner Organization")).toBeVisible()
    await expect(page.getByText("member@example.com")).toBeVisible()
    await expect(page.getByText("pending@example.com")).toBeVisible()

    await page.getByLabel("Organization name").fill("Renamed Organization")
    await page.getByRole("button", { name: "Save name" }).click()
    await expect(page.getByText("Organization name updated")).toBeVisible()
    await expect(page.getByText("Renamed Organization")).toBeVisible()

    await page.getByLabel("Invitation email").fill("new@example.com")
    await page.getByRole("button", { name: "Invite" }).click()
    await expect(page.getByText("Invitation sent")).toBeVisible()
    await expect(page.getByText("new@example.com")).toBeVisible()

    await page
      .getByRole("row", { name: /Member User/ })
      .getByRole("combobox")
      .click()
    await page.getByRole("option", { name: "Admin" }).click()
    await expect(page.getByText("Member role updated")).toBeVisible()

    await page
      .getByRole("row", { name: /Member User/ })
      .getByRole("button", { name: "Remove" })
      .click()
    await expect(page.getByText("Member removed")).toBeVisible()
    await expect(page.getByText("member@example.com")).toHaveCount(0)

    await page.getByRole("button", { name: "Accept" }).click()
    await expect(page.getByText("Invitation accepted")).toBeVisible()
  })
})

test.describe("Billing", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Billing tab shows Stripe subscription state", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("access_token", "frontend-test-token")
    })

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

    await page.route("**/api/v1/billing/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          has_customer: true,
          subscription_status: "active",
          subscription_current_period_end: "2026-06-14T20:00:00Z",
          subscription_cancel_at_period_end: false,
          price_id: "price_test",
          is_subscription_active: true,
          subscription_tier: "pro",
        }),
      })
    })

    await page.goto("/settings?tab=billing")

    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: "Billing" }),
    ).toBeVisible()
    await expect(page.getByText("Active")).toBeVisible()
    await expect(page.getByText("Renews automatically")).toBeVisible()
    await expect(page.getByRole("button", { name: "Pro tier" })).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Manage billing" }),
    ).toBeEnabled()
  })
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

test("Connect agent generates the hosted MCP setup and hides revoked credentials", async ({
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
      label: "AI laptop",
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
    page.getByText("Token and config snippets for local MCP testing."),
  ).toBeVisible()
  await expect(page.getByText("Hosted MCP URL")).toHaveCount(0)
  await expect(
    page.getByText("https://enderai-mcp.onrender.com/mcp"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("tab", { name: "Generic MCP client" }),
  ).toHaveCount(0)

  await page.getByLabel("Credential label").fill("AI laptop")
  await page.getByTestId("create-agent-credential").click()

  await expect(page.getByText("Agent credential created")).toBeVisible()
  await expect(page.getByText("Where this goes")).toHaveCount(0)
  await expect(page.getByText("Export this env var")).toHaveCount(0)
  await expect(
    page.getByText("Optional: persist the token across new terminals"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("tab", { name: "AI assisted setup" }),
  ).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tab", { name: "Manual setup" })).toBeVisible()
  await expect(page.getByText("Ask an agent to wire it up")).toBeVisible()
  await expect(
    page.getByText("Paste this into the agent doing setup."),
  ).toBeVisible()
  await expect(
    page.getByText(
      "After saving the shell config, start from a fresh terminal",
    ),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Persist the token",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "printf '%s\\n'",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "mcp-token-abc",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "# Set up MCP config",
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
    "# Reconnect the AI client",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "start from a fresh terminal",
  )
  await expect(page.getByTestId("connect-agent-ai-setup")).toContainText(
    "token environment",
  )

  await page.getByRole("tab", { name: "Manual setup" }).click()
  await expect(page.getByText("Persist token")).toBeVisible()
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("mcp-token-abc")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("chmod 600 ~/.enderai_mcp_token")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("# >>> EnderAI MCP token >>>")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText("awk -v start=")
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).toContainText('export ENDERAI_MCP_TOKEN="$(tr -d')
  await expect(
    page.getByTestId("connect-agent-persistent-shell"),
  ).not.toContainText("ENDERAI_BACKEND_TOKEN")
  await expect(page.getByTestId("connect-agent-config")).toContainText(
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  )
  await expect(
    page.getByText("Add this block to your AI client's MCP config."),
  ).toBeVisible()
  await expect(page.getByTestId("connect-agent-config")).not.toContainText(
    "X-EnderAI-Backend-Token",
  )
  const persistStepTop = await page.getByText("Persist token").boundingBox()
  const configStepTop = await page.getByText("MCP client config").boundingBox()
  expect(persistStepTop?.y).toBeLessThan(configStepTop?.y ?? 0)
  await expect(page.getByText("Reconnect AI client")).toBeVisible()
  await expect(
    page.getByText("After the setup above, start a fresh terminal"),
  ).toBeVisible()
  await expect(
    page.getByTestId("connect-agent-reconnect-client"),
  ).toContainText("Start a fresh terminal")
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
    "creating or rotating an EnderAI MCP credential",
  )
  await expect(page.getByTestId("connect-agent-instructions")).toContainText(
    "fresh terminal",
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
  const reconnectStepTop = await page
    .getByText("Reconnect AI client")
    .boundingBox()
  expect(configStepTop?.y).toBeLessThan(instructionStepTop?.y ?? 0)
  expect(instructionStepTop?.y).toBeLessThan(reconnectStepTop?.y ?? 0)
  await expect(
    page.locator('[data-slot="card-title"]').filter({ hasText: "Credentials" }),
  ).toBeVisible()

  await page.reload()
  await page.getByRole("tab", { name: "Connect agent" }).click()

  await expect(page.getByText("Persist token")).toHaveCount(0)
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
  await expect(page.getByText("Reconnect AI client")).toHaveCount(0)
  await expect(page.getByTestId("connect-agent-reconnect-client")).toHaveCount(
    0,
  )
  await expect(page.getByTestId("connect-agent-instructions")).toHaveCount(0)
  await expect(page.getByText("Minimal agent instruction")).toHaveCount(0)
  await expect(page.getByText("Ask an agent to wire it up")).toHaveCount(0)
  await expect(page.getByText("enderai_finish_case")).toHaveCount(0)
  await expect(page.getByText("enderai_begin_case")).toHaveCount(0)
  await expect(page.getByText("# Add agent instruction")).toHaveCount(0)
  await expect(page.getByText("# Reconnect the AI client")).toHaveCount(0)
  await expect(page.getByText("# Set up MCP config")).toHaveCount(0)
  await expect(page.getByText("Revoked install")).toHaveCount(0)
})

test("Connect agent shows V2 document instructions for V2-enabled users", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "frontend-test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-v2",
        email: "frontend-v2-test@example.com",
        is_active: true,
        is_superuser: false,
        full_name: "Frontend V2 Test User",
        created_at: "2026-03-14T20:00:00Z",
        v2: true,
      }),
    })
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
      id: "agent-credential-v2",
      user_id: "user-v2",
      label: "V2 laptop",
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
        mcp_access_token: "mcp-token-v2",
        token_type: "bearer",
      }),
    })
  })

  await page.goto("/settings?tab=connect-agent")
  await page.getByLabel("Credential label").fill("V2 laptop")
  await page.getByTestId("create-agent-credential").click()

  const aiSetup = page.getByTestId("connect-agent-ai-setup")
  await expect(aiSetup).toContainText("Taskforce V2 MCP tools")
  await expect(aiSetup).toContainText("Taskforce document at the start")
  await expect(aiSetup).toContainText("Summary view")
  await expect(aiSetup).toContainText("Details view")
  await expect(aiSetup).toContainText("evidence anchors")
  await expect(aiSetup).toContainText("prefer Taskforce V2 document tools")
  await expect(aiSetup).not.toContainText("enderai_begin_case")

  await page.getByRole("tab", { name: "Manual setup" }).click()
  const instructions = page.getByTestId("connect-agent-instructions")
  await expect(instructions).toContainText("Taskforce V2 MCP tools")
  await expect(instructions).not.toContainText("enderai_finish_case")
})
