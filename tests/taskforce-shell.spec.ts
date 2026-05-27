import { expect, type Page, test } from "@playwright/test"

import { mockV2Documents } from "./fixtures/v2-documents"

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

async function mockTaskforceAuth(
  page: Page,
  { incomingInvitationCount = 0 }: { incomingInvitationCount?: number } = {},
) {
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

  await page.route("**/api/v1/organizations/invitations", async (route) => {
    const data = Array.from(
      { length: incomingInvitationCount },
      (_, index) => ({
        id: `invite-${index + 1}`,
        organization_id: `org-${index + 1}`,
        organization_name: `Partner Organization ${index + 1}`,
        invited_email: currentUser.email,
        invited_by_user_id: `partner-admin-${index + 1}`,
        created_at: "2026-03-17T20:00:00Z",
        accepted_at: null,
        revoked_at: null,
      }),
    )

    await route.fulfill({ json: { data, count: data.length } })
  })
}

async function dragSidebarRail(page: Page, deltaX: number) {
  const rail = page.getByTestId("sidebar-drag-rail").first()
  const box = await rail.boundingBox()

  expect(box).not.toBeNull()

  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY, { steps: 4 })
  await page.mouse.up()
}

test("Taskforce v2 sidebar includes drag collapse and Extras controls", async ({
  page,
}) => {
  await mockTaskforceAuth(page)
  await mockV2Documents(page)

  await page.goto("/v2/library")

  const sidebar = page.locator('[data-slot="sidebar"]').first()
  const sidebarRail = page.getByTestId("sidebar-drag-rail").first()
  const extrasDrawer = page.getByTestId("taskforce-sidebar-utility-drawer")
  const extrasHandle = page.getByTestId("taskforce-sidebar-utility-handle")
  const documentLookup = page.getByTestId("v2-document-lookup-input")

  await expect(page.getByTestId("sidebar-collapse-toggle")).toHaveCount(0)
  await expect(sidebarRail).toBeVisible()
  await expect(extrasHandle).toHaveAttribute("aria-label", "Sidebar utilities")
  await expect(extrasDrawer).toContainText("Demo mode")
  await expect(documentLookup).toBeVisible()
  await expect(documentLookup).toHaveAttribute(
    "placeholder",
    "Search documents",
  )
  await expect(page.getByText("Experimental workspace")).toHaveCount(0)
  await expect(page.getByTestId("v2-mode-switch")).toHaveCount(0)

  await extrasHandle.click()
  await expect(extrasDrawer).toHaveAttribute("data-collapsed", "true")
  await expect
    .poll(() =>
      page.evaluate(() => ({
        local: window.localStorage.getItem(
          "taskforce.sidebar.extras.collapsed",
        ),
        session: window.sessionStorage.getItem(
          "taskforce.sidebar.extras.collapsed",
        ),
      })),
    )
    .toEqual({ local: "true", session: "true" })

  await page.reload()
  await expect(extrasDrawer).toHaveAttribute("data-collapsed", "true")

  await extrasHandle.click()
  await expect(extrasDrawer).toHaveAttribute("data-collapsed", "false")
  await expect
    .poll(() =>
      page.evaluate(() => ({
        local: window.localStorage.getItem(
          "taskforce.sidebar.extras.collapsed",
        ),
        session: window.sessionStorage.getItem(
          "taskforce.sidebar.extras.collapsed",
        ),
      })),
    )
    .toEqual({ local: "false", session: "false" })

  await dragSidebarRail(page, -80)
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await page.waitForTimeout(250)

  await dragSidebarRail(page, 80)
  await expect(sidebar).toHaveAttribute("data-state", "expanded")
})

test("Taskforce v2 sidebar shows pending organization invite badge on the account button", async ({
  page,
}) => {
  await mockTaskforceAuth(page, { incomingInvitationCount: 2 })
  await mockV2Documents(page)

  await page.goto("/v2/library")

  const inviteBadge = page.getByTestId("organization-invite-badge")
  await expect(inviteBadge).toBeVisible()
  await expect(inviteBadge).toHaveText("2")
  await expect(inviteBadge).toHaveAttribute(
    "title",
    "2 pending organization invitations",
  )

  await page.getByTestId("user-menu").click()
  const settingsInviteBadge = page.getByTestId("user-settings-invite-badge")
  await expect(settingsInviteBadge).toBeVisible()
  await expect(settingsInviteBadge).toHaveText("2")
  await expect(settingsInviteBadge).toHaveAttribute(
    "title",
    "2 pending organization invitations",
  )

  await page.keyboard.press("Escape")
  await dragSidebarRail(page, -80)
  await expect(inviteBadge.first()).toBeVisible()
})

test("Taskforce v2 Admin link stays inside the v2 shell", async ({ page }) => {
  await mockTaskforceAuth(page)
  await mockV2Documents(page)

  await page.goto("/v2/library")
  await page.getByRole("link", { name: "Admin" }).click()

  await expect(page).toHaveURL(/\/v2\/admin$/)
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible()
  await expect(
    page.getByText("Manage user accounts and permissions"),
  ).toBeVisible()
  await expect(page.getByText("Taskforce").first()).toBeVisible()
})

test("Upgrade link opens membership tiers with current and selected indicators", async ({
  page,
}) => {
  await mockTaskforceAuth(page)
  await mockV2Documents(page)

  await page.goto("/v2/library")
  await page.getByRole("link", { name: "Upgrade" }).click()

  await expect(page).toHaveURL(/\/v2\/pricing$/)
  await expect(
    page.getByRole("heading", {
      name: "Choose the Taskforce tier right for your team",
    }),
  ).toBeVisible()
  await expect(page.getByTestId("membership-plan-free")).toContainText(
    "You already have this tier",
  )
  await expect(page.getByTestId("membership-plan-pro")).toContainText("$4.99")
  await expect(page.getByTestId("membership-plan-max")).toContainText("$49.99")

  let checkoutBody: unknown
  await page.route("**/api/v1/billing/checkout-session", async (route) => {
    checkoutBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.test/max" }),
    })
  })

  await page.getByTestId("membership-plan-max").click()
  await page.getByRole("button", { name: "Select this tier" }).click()
  await expect.poll(() => checkoutBody).toEqual({ tier: "max" })
})

test("Taskforce v2 wordmark links to Taskforce Library", async ({ page }) => {
  await mockTaskforceAuth(page)
  await mockV2Documents(page)

  await page.goto("/v2/library")
  await page.getByRole("link", { name: "Taskforce" }).click()

  await expect(page).toHaveURL(/\/v2\/library$/)
})

test("Taskforce v2 document search filters demo documents and opens results", async ({
  page,
}) => {
  await mockTaskforceAuth(page)
  await mockV2Documents(page)

  await page.goto("/v2/library")

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
  const lookupResults = page.getByTestId("v2-document-lookup-results")
  await expect(
    lookupResults
      .getByText("Latest Stale Network Bridge Issue", { exact: true })
      .first(),
  ).toBeVisible()
  await expect(
    lookupResults.getByText("Hosted MCP Credential Setup Refresh"),
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
  await mockV2Documents(page)
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
  const backLinkWidth = await page
    .getByTestId("v2-document-back-link")
    .evaluate((element) => element.getBoundingClientRect().width)
  expect(backLinkWidth).toBeLessThan(160)
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
  await expect(
    page.getByText("XYZ Corp users hit stale bridge routing"),
  ).toBeVisible()
  await expect(page.getByText("Evidence-backed claims")).toHaveCount(0)
  await expect(page.getByText("Affected Users And Symptoms")).not.toBeVisible()

  const documentScroll = page.getByTestId("v2-document-scroll")
  const stickyHeader = page.getByTestId("v2-document-sticky-header")
  await expect
    .poll(
      async () =>
        documentScroll.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      { message: "document page should not have horizontal overflow" },
    )
    .toBe(true)
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
  await expect(
    page.getByText("XYZ Corp users hit stale bridge routing"),
  ).toBeVisible()
  await expect(
    page.getByText("latest-stale-network-bridge-issue.details.md"),
  ).toBeVisible()
  await expect(page.getByText("Created May 10, 2026")).toBeVisible()
  await expect(page.getByText("Updated May 12, 2026")).toBeVisible()

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
  await expect(
    page.getByText("XYZ Corp users hit stale bridge routing"),
  ).toBeVisible()
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
  await expect(
    page.getByText("XYZ Corp users hit stale bridge routing"),
  ).toBeVisible()
  await expect(
    page.getByText("latest-stale-network-bridge-issue.details.md"),
  ).not.toBeVisible()
})

test("Taskforce v2 document save uses document scope instead of sidebar demo mode", async ({
  page,
}) => {
  await mockTaskforceAuth(page)

  const liveDocument = {
    id: "e7531338-c788-4d30-a4d4-7e3c2053e803",
    title: "Live Editable Document",
    description: "Document that should save outside demo mode.",
    human_summary: "Live summary.",
    ai_generated_summary: "AI summary.",
    collaborators: ["Alex Lee"],
    main_body: [{ segments: [{ text: "Live report body." }] }],
    details_file_name: "live-editable-document.details.md",
    details_markdown_sections: [
      {
        anchor_id: "live-details",
        markdown: "## Live Details\nEvidence stays editable.",
      },
    ],
    is_demo: false,
    created_at: "2026-05-18T00:00:00Z",
    updated_at: "2026-05-18T00:00:00Z",
  }
  const patchUrls: string[] = []

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (url.pathname === `/api/v1/v2/documents/${liveDocument.id}`) {
      if (method === "GET") {
        await route.fulfill({ json: liveDocument })
        return
      }
      if (method === "PATCH") {
        patchUrls.push(route.request().url())
        const body = JSON.parse(route.request().postData() ?? "{}")
        await route.fulfill({ json: { ...liveDocument, ...body } })
        return
      }
    }

    await route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.goto("/v2/library")
  await page.getByTestId("demo-mode-toggle").click()
  await page.goto(`/v2/library/${liveDocument.id}`)

  await page.getByTestId("document-edit").click()
  await page.getByTestId("edit-title").fill("Updated Live Editable Document")
  await page.getByTestId("document-save").click()

  await expect(page.getByText("Document saved.")).toBeVisible()
  expect(patchUrls).toHaveLength(1)
  expect(new URL(patchUrls[0]).searchParams.get("demo")).toBeNull()
})
