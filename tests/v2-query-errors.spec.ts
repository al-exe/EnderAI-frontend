import { expect, type Page, test } from "@playwright/test"

const documentId = "document-retry-test"

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

const document = {
  id: documentId,
  owner_id: currentUser.id,
  organization_id: "org-1",
  folder_id: null,
  folder_name: null,
  visibility: "private",
  user_access: "owner",
  is_favorite: false,
  title: "Retryable document",
  description: "A document used to verify explicit API failure states.",
  human_summary: "The document remains available after dependent queries fail.",
  ai_generated_summary: "A deterministic browser-test fixture.",
  collaborators: ["Alex Lee"],
  shared_with: [],
  main_body: [
    { segments: [{ text: "Retry states protect document context." }] },
  ],
  details_file_name: "retryable-document.details.md",
  details_markdown_sections: [
    {
      anchor_id: "retry-state",
      markdown: "## Retry state\nThe document loaded successfully.",
    },
  ],
  is_demo: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-12T00:00:00Z",
}

const organization = {
  id: "org-1",
  name: "Taskforce",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  organization_role: "admin",
  members: [
    {
      id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.full_name,
      organization_role: "admin",
    },
    {
      id: "user-2",
      email: "teammate@example.com",
      full_name: "Team Mate",
      organization_role: "member",
    },
  ],
  invitations: [],
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockShell(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
    window.localStorage.setItem("taskforce-demo-mode", "false")
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
    await route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.route(
    "**/api/v1/v2/taskforce/documents/*/sessions**",
    async (route) => {
      await route.fulfill({
        json: {
          scope: "organization",
          organization_id: "org-1",
          total: 0,
          limit: 6,
          offset: 0,
          rows: [],
        },
      })
    },
  )
}

test("Library retries a failed initial load without showing empty content", async ({
  page,
}) => {
  await mockShell(page)
  let documentAttempts = 0

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/v1/v2/documents/folders/") {
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }
    if (url.pathname === "/api/v1/v2/documents/") {
      documentAttempts += 1
      if (documentAttempts === 1) {
        await route.fulfill({
          status: 500,
          json: { detail: "Library temporarily unavailable" },
        })
        return
      }
      await route.fulfill({ json: { data: [document], count: 1 } })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.goto("/v2/library")

  await expect(page.getByTestId("library-load-error")).toBeVisible()
  await expect(page.getByText("No documents yet.")).toHaveCount(0)
  await expect(page.getByText("Connect a terminal")).toHaveCount(0)

  await page.getByTestId("library-load-error").getByRole("button").click()

  await expect(page.getByText(document.title).first()).toBeVisible()
  expect(documentAttempts).toBe(2)
})

test("document detail retries a 500 instead of rendering not found", async ({
  page,
}) => {
  await mockShell(page)
  let documentAttempts = 0

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === `/api/v1/v2/documents/${documentId}`) {
      documentAttempts += 1
      if (documentAttempts === 1) {
        await route.fulfill({
          status: 500,
          json: { detail: "Document temporarily unavailable" },
        })
        return
      }
      await route.fulfill({ json: document })
      return
    }
    if (url.pathname === "/api/v1/v2/documents/folders/") {
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }
    if (url.pathname.endsWith("/shares/")) {
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }
    await route.fulfill({ json: { data: [document], count: 1 } })
  })
  await page.route("**/api/v1/organizations/me", async (route) => {
    await route.fulfill({ json: organization })
  })

  await page.goto(`/v2/library/${documentId}`)

  await expect(page.getByTestId("document-detail-load-error")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Document not found" }),
  ).toHaveCount(0)

  await page
    .getByTestId("document-detail-load-error")
    .getByRole("button")
    .click()

  await expect(
    page.getByRole("heading", { name: document.title }),
  ).toBeVisible()
  expect(documentAttempts).toBe(2)
})

test("document sharing metadata exposes a retry without losing the document", async ({
  page,
}) => {
  await mockShell(page)
  let organizationAttempts = 0
  let shareAttempts = 0

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === `/api/v1/v2/documents/${documentId}`) {
      await route.fulfill({ json: document })
      return
    }
    if (url.pathname === "/api/v1/v2/documents/folders/") {
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }
    if (url.pathname.endsWith("/shares/")) {
      shareAttempts += 1
      if (shareAttempts === 1) {
        await route.fulfill({
          status: 500,
          json: { detail: "Shares temporarily unavailable" },
        })
        return
      }
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }
    await route.fulfill({ json: { data: [document], count: 1 } })
  })
  await page.route("**/api/v1/organizations/me", async (route) => {
    organizationAttempts += 1
    if (organizationAttempts === 1) {
      await route.fulfill({
        status: 500,
        json: { detail: "Organization temporarily unavailable" },
      })
      return
    }
    await route.fulfill({ json: organization })
  })

  await page.goto(`/v2/library/${documentId}`)
  await expect(
    page.getByRole("heading", { name: document.title }),
  ).toBeVisible()

  await page.getByTestId("document-access").click()
  await expect(page.getByTestId("document-access-load-error")).toBeVisible()
  await expect(
    page.getByText("No organization members available."),
  ).toHaveCount(0)

  await page
    .getByTestId("document-access-load-error")
    .getByRole("button")
    .click()

  await expect(page.getByText("Team Mate")).toBeVisible()
  expect(organizationAttempts).toBe(2)
  expect(shareAttempts).toBe(2)
})
