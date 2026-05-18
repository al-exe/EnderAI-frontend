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
  const documentLookup = page.getByTestId("v2-document-lookup-input")

  await expect(collapseToggle).toBeVisible()
  await expect(appearanceButton).toBeVisible()
  await expect(documentLookup).toBeVisible()
  await expect(documentLookup).toHaveAttribute(
    "placeholder",
    "Search documents",
  )
  await expect(page.getByText("Experimental workspace")).toHaveCount(0)

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

test("Taskforce v2 wordmark links to v2 home", async ({ page }) => {
  await mockTaskforceAuth(page)

  await page.goto("/v2/library")
  await page.getByRole("link", { name: "Taskforce" }).click()

  await expect(page).toHaveURL(/\/v2\/home$/)
})

test("Taskforce v2 document search filters demo documents and opens results", async ({
  page,
}) => {
  await mockTaskforceAuth(page)

  await page.goto("/v2/home")

  const search = page.getByTestId("v2-document-lookup-input")
  await expect(search).toBeVisible()

  // Without demo mode, typing prompts the user to enable it.
  await search.fill("bridge")
  await expect(page.getByTestId("v2-document-lookup-hint")).toBeVisible()
  await expect(page.getByTestId("v2-document-lookup-results")).toContainText(
    "demo mode",
  )

  // Enabling demo mode replaces the hint with matching documents.
  await search.fill("")
  await page.getByTestId("demo-mode-toggle").click()
  await search.fill("bridge")
  await expect(
    page
      .getByText("Latest Stale Network Bridge Issue", { exact: true })
      .first(),
  ).toBeVisible()
  await expect(
    page.getByText("Hosted MCP Credential Setup Refresh"),
  ).toHaveCount(0)

  // Unrelated query produces an empty-state message.
  await search.fill("zzzzznomatch")
  await expect(page.getByTestId("v2-document-lookup-empty")).toBeVisible()

  // Enter on the first result navigates to that document.
  await search.fill("evidence contract")
  await expect(
    page.getByTestId(
      "v2-document-lookup-result-5b7462e9-6b0e-4d48-81a2-07f052534a12",
    ),
  ).toBeVisible()
  await search.press("Enter")
  await expect(page).toHaveURL(
    /\/v2\/library\/5b7462e9-6b0e-4d48-81a2-07f052534a12$/,
  )
  await expect(
    page.getByRole("heading", { name: "V2 Document Evidence Contract" }),
  ).toBeVisible()

  // After navigation, the search input is reset.
  await expect(search).toHaveValue("")

  // Clicking a result navigates to a different document.
  await search.fill("hosted mcp")
  await page
    .getByTestId(
      "v2-document-lookup-result-0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d",
    )
    .click()
  await expect(page).toHaveURL(
    /\/v2\/library\/0fd8a545-a3b7-4a9f-bb65-1ecf76bd8b6d$/,
  )

  // Escape closes the dropdown without navigating.
  await search.fill("bridge")
  await expect(page.getByTestId("v2-document-lookup-results")).toBeVisible()
  await search.press("Escape")
  await expect(page.getByTestId("v2-document-lookup-results")).toHaveCount(0)
})

test("Taskforce v2 library shows document demo data only in demo mode", async ({
  page,
}) => {
  await mockTaskforceAuth(page)
  await page.setViewportSize({ width: 1280, height: 420 })

  await page.goto("/v2/library")
  await expect(page.getByText("Latest Stale Network Bridge Issue")).toHaveCount(
    0,
  )
  await expect(page.getByText("No documents yet.")).toBeVisible()

  await page.getByTestId("demo-mode-toggle").click()

  await expect(
    page.getByText("Latest Stale Network Bridge Issue"),
  ).toBeVisible()
  await expect(page.getByText("V2 Document Evidence Contract")).toBeVisible()
  await expect(
    page.getByText("Hosted MCP Credential Setup Refresh"),
  ).toBeVisible()
  await expect(page.getByText("AI detail seed")).toHaveCount(0)
  await expect(page.getByText("Resolved", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Ready", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Draft", { exact: true })).toHaveCount(0)

  await page.getByText("Latest Stale Network Bridge Issue").click()
  await expect(page).toHaveURL(
    /\/v2\/library\/8c9b0f48-2f3f-4e8d-9f7d-b4f0607d6a32$/,
  )
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByText("Overview")).toBeVisible()
  await expect(page.getByText("Report")).toBeVisible()
  await expect(page.getByText("Evidence-backed claims")).toHaveCount(0)
  await expect(page.getByText("Affected Users And Symptoms")).not.toBeVisible()

  const documentScroll = page.getByTestId("v2-document-scroll")
  const stickyHeader = page.getByTestId("v2-document-sticky-header")
  await documentScroll.evaluate((element) => {
    element.scrollTop = 500
  })
  await expect(stickyHeader).toBeInViewport()
  await expect(
    page.getByText(
      "Customer-impact investigation with a verified operator fix and command evidence.",
    ),
  ).not.toBeInViewport()
  await documentScroll.evaluate((element) => {
    element.scrollTop = 0
  })

  await page.getByRole("tab", { name: "Split" }).click()
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByText("Overview")).toBeVisible()
  await expect(
    page.getByText("latest-stale-network-bridge-issue.details.md"),
  ).toBeVisible()
  await expect(page.getByText("Created May 10, 2026")).toBeVisible()
  await expect(page.getByText("Updated May 12, 2026")).toBeVisible()
  await expect(page.getByText("Alex Lee, Nia Patel")).toBeVisible()

  await page.getByRole("tab", { name: "Summary" }).click()
  await page.getByTestId("human-evidence-affected-users").click()

  // Anchor click opens split view with both Summary and Details visible.
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByText("Overview")).toBeVisible()
  await expect(
    page.getByText("latest-stale-network-bridge-issue.details.md"),
  ).toBeVisible()
  await expect(page.getByText("## Affected Users And Symptoms")).toBeVisible()
  await expect(
    page.getByText("<!-- evidence-anchor: affected-users -->"),
  ).toBeVisible()
  await expect(page.getByTestId("ai-evidence-affected-users")).toHaveAttribute(
    "data-active-evidence",
    "true",
  )

  // Close button returns to Summary-only view.
  await page.getByTestId("evidence-split-close").click()
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute(
    "data-state",
    "active",
  )
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute(
    "data-state",
    "inactive",
  )
  await expect(page.getByText("Overview")).toBeVisible()
  await expect(
    page.getByText("latest-stale-network-bridge-issue.details.md"),
  ).not.toBeVisible()
})
