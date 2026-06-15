import { expect, type Page, test } from "@playwright/test"

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

async function mockFleet(
  page: Page,
  options: { includeDestination?: boolean } = {},
) {
  let agentFleetId = "fleet-1"
  const agent = {
    session_id: "session-1",
    fleet_session_id: agentFleetId,
    cwd: "/workspace/billing",
    branch: "feature/automatic-tax",
    repo: "billing",
    active_document_id: "doc-1",
    referenced_document_ids: ["doc-2"],
    title: "Stripe checkout wiring",
    summary_markdown: "Wiring automatic tax onto the subscription create path",
    last_seen_at: "2026-06-12T10:20:00Z",
    minutes_ago: 10,
    status: "running",
    started_at: "2026-06-12T09:42:00Z",
    specialist_slug: "billing",
    specialist_rule_count: 4,
    model_id: "claude-opus-4-8",
  }

  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === "/api/v1/users/me") {
      await route.fulfill({ json: currentUser })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })

  await page.route("**/api/v1/v2/taskforce/fleet", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: {
          id: "fleet-2",
          name: "",
          is_history: false,
          created_at: "2026-06-12T10:30:00Z",
          updated_at: "2026-06-12T10:30:00Z",
          agents: [],
        },
      })
      return
    }

    await route.fulfill({
      json: {
        fleet_sessions: [
          {
            id: "fleet-1",
            name: "stripe-checkout",
            is_history: false,
            created_at: "2026-06-12T10:00:00Z",
            updated_at: "2026-06-12T10:20:00Z",
            agents:
              agentFleetId === "fleet-1"
                ? [{ ...agent, fleet_session_id: agentFleetId }]
                : [],
          },
          ...(options.includeDestination
            ? [
                {
                  id: "fleet-2",
                  name: "checkout-review",
                  is_history: false,
                  created_at: "2026-06-12T10:30:00Z",
                  updated_at: "2026-06-12T10:30:00Z",
                  agents:
                    agentFleetId === "fleet-2"
                      ? [{ ...agent, fleet_session_id: agentFleetId }]
                      : [],
                },
              ]
            : []),
          {
            id: "fleet-history",
            name: "History",
            is_history: true,
            created_at: "2026-06-12T09:00:00Z",
            updated_at: "2026-06-12T09:00:00Z",
            agents: [],
          },
        ],
      },
    })
  })

  await page.route(
    "**/api/v1/v2/taskforce/session/session-1",
    async (route) => {
      const body = route.request().postDataJSON() as {
        fleet_session_id: string
      }
      agentFleetId = body.fleet_session_id
      await route.fulfill({
        json: { ...agent, fleet_session_id: agentFleetId },
      })
    },
  )

  await page.route("**/api/v1/v2/taskforce/session-log**", async (route) => {
    await route.fulfill({
      json: {
        session_id: "session-1",
        entries: [
          {
            document_id: "doc-1",
            title: "Stripe checkout wiring",
            score: 0.9,
            confidence_band: "high",
            match_reasons: [],
            summary_markdown: "Automatic tax wiring",
            occurred_at: "2026-06-12T10:18:00Z",
            query_id: "q-1",
            net_saved_tokens: 1200,
          },
        ],
      },
    })
  })

  await page.route(
    "**/api/v1/v2/taskforce/session-activity**",
    async (route) => {
      await route.fulfill({
        json: {
          session_id: "session-1",
          entries: [
            {
              id: "act-2",
              occurred_at: "2026-06-12T10:18:00Z",
              prompt: "Add the automatic tax line item",
              response_summary: "Wired automatic tax onto subscription create",
              ledger_href:
                "/v2/ledger?session_id=session-1&at=2026-06-12T10:18:00Z",
            },
            {
              id: "act-1",
              occurred_at: "2026-06-12T10:02:00Z",
              prompt: "Investigate the Stripe checkout flow",
              response_summary: null,
              ledger_href: null,
            },
          ],
        },
      })
    },
  )

  await page.route("**/api/v1/v2/documents/**", async (route) => {
    await route.fulfill({
      json: {
        id: "doc-2",
        title: "Payments — error taxonomy",
        content_markdown: "",
      },
    })
  })
}

test("Fleet renders the calm roster from live API data", async ({ page }) => {
  await mockFleet(page)
  await page.goto("/v2/fleet")

  await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible()
  await expect(page.getByText("stripe-checkout", { exact: true })).toBeVisible()
  await expect(page.getByText("Opus 4.8")).toBeVisible()
  await expect(page.getByText("10m")).toBeVisible()
  await expect(
    page.getByText("Wiring automatic tax onto the subscription create path"),
  ).toBeVisible()
  // Calm summary line — agents · running · fleets, no spend/token metrics.
  await expect(page.getByText("1 agent · 1 running · 1 fleet")).toBeVisible()

  // The rejected metrics direction must not reappear.
  await expect(page.getByText(/tokens/i)).toHaveCount(0)
  await expect(page.getByText(/saved by reuse/i)).toHaveCount(0)

  // New fleet creates a nameless fleet (no request body).
  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/v1/v2/taskforce/fleet") &&
      request.method() === "POST",
  )
  await page.getByRole("button", { name: "New fleet" }).click()
  expect((await createRequest).postDataJSON()).toEqual({})
})

test("clicking an agent row opens the session detail and back returns", async ({
  page,
}) => {
  await mockFleet(page)
  await page.goto("/v2/fleet")

  await page.getByText("Stripe checkout wiring").first().click()

  await expect(page).toHaveURL(/\/v2\/fleet\/session-1$/)
  await expect(
    page.getByRole("heading", { name: "Stripe checkout wiring" }),
  ).toBeVisible()
  await expect(page.getByText("Working on")).toBeVisible()
  await expect(page.getByText("Activity")).toBeVisible()
  await expect(page.getByText("Session", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("4 conventions applied")).toBeVisible()
  await expect(page.getByText("Started")).toBeVisible()

  // Breadcrumb returns to the roster.
  await page.getByRole("link", { name: "Fleet" }).first().click()
  await expect(page).toHaveURL(/\/v2\/fleet$/)
  await expect(page.getByText("stripe-checkout", { exact: true })).toBeVisible()
})

test("activity timeline shows per-turn entries newest-first and links to the Ledger", async ({
  page,
}) => {
  await mockFleet(page)
  await page.goto("/v2/fleet/session-1")

  // Both captured turns render, with the agent's response summary as subtext.
  const newest = page.getByText("Add the automatic tax line item")
  const oldest = page.getByText("Investigate the Stripe checkout flow")
  await expect(newest).toBeVisible()
  await expect(oldest).toBeVisible()
  await expect(
    page.getByText("Wired automatic tax onto subscription create"),
  ).toBeVisible()

  // Newest-on-top ordering: the live "now" head sits above both turns, and the
  // newer turn precedes the older one in the DOM.
  const timeline = page.getByText("now", { exact: true })
  await expect(timeline).toBeVisible()
  const newestBox = await newest.boundingBox()
  const oldestBox = await oldest.boundingBox()
  expect(newestBox && oldestBox && newestBox.y < oldestBox.y).toBe(true)

  // The org-available turn deep-links to the Ledger, anchored at its timestamp.
  const ledgerLink = page.getByRole("link", {
    name: "Add the automatic tax line item",
  })
  const href = await ledgerLink.getAttribute("href")
  expect(href).toContain("/v2/ledger?")
  expect(href).toContain("session_id=session-1")
  expect(href).toContain("at=")
})

test("dragging an agent moves it to another fleet", async ({ page }) => {
  await mockFleet(page, { includeDestination: true })
  await page.goto("/v2/fleet")

  const moveRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/v1/v2/taskforce/session/session-1") &&
      request.method() === "PATCH",
  )
  await page
    .getByTestId("fleet-agent-row")
    .dragTo(page.getByTestId("fleet-card-fleet-2"))

  expect((await moveRequest).postDataJSON()).toEqual({
    fleet_session_id: "fleet-2",
  })
  await expect(
    page.getByTestId("fleet-card-fleet-1").getByTestId("fleet-agent-row"),
  ).toHaveCount(0)
  await expect(
    page.getByTestId("fleet-card-fleet-2").getByTestId("fleet-agent-row"),
  ).toContainText("Stripe checkout wiring")
})

for (const theme of ["light", "dark"] as const) {
  test(`Fleet stays responsive in ${theme} theme`, async ({ page }) => {
    await mockFleet(page)
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("vite-ui-theme", selectedTheme)
    }, theme)

    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/v2/fleet")
      await expect(page.getByRole("heading", { name: "Fleet" })).toBeVisible()
      await expect(page.locator("html")).toHaveClass(new RegExp(theme))

      const rosterOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(rosterOverflow).toBeLessThanOrEqual(0)

      const shellTrigger = page.locator('[data-slot="sidebar-trigger"]')
      if (width === 360) {
        await expect(shellTrigger).toBeVisible()
        await expect(
          page.getByRole("link", { name: "Profiles" }),
        ).not.toBeVisible()
      } else {
        await expect(shellTrigger).not.toBeVisible()
        await expect(page.getByRole("link", { name: "Profiles" })).toBeVisible()
      }

      const rosterColumns = await page
        .getByTestId("fleet-agent-row")
        .evaluate((row) => getComputedStyle(row).gridTemplateColumns)
      expect(rosterColumns.trim().split(/\s+/)).toHaveLength(
        width === 360 ? 3 : 4,
      )

      await page.goto("/v2/fleet/session-1")
      await expect(
        page.getByRole("heading", { name: "Stripe checkout wiring" }),
      ).toBeVisible()

      const detailLayout = await page.evaluate(() => {
        const detail = document.querySelector<HTMLElement>(
          '[data-testid="fleet-agent-detail"]',
        )
        const body = document.querySelector<HTMLElement>(
          '[data-testid="fleet-detail-body"]',
        )
        const rail = document.querySelector<HTMLElement>(
          '[data-testid="fleet-detail-rail"]',
        )
        if (!detail || !body || !rail) throw new Error("Fleet detail missing")

        return {
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          detailOverflowY: getComputedStyle(detail).overflowY,
          bodyDisplay: getComputedStyle(body).display,
          railBorderTop: getComputedStyle(rail).borderTopWidth,
          railBorderLeft: getComputedStyle(rail).borderLeftWidth,
        }
      })

      expect(detailLayout.overflow).toBeLessThanOrEqual(0)
      if (width <= 880) {
        expect(detailLayout.detailOverflowY).toBe("auto")
        expect(detailLayout.bodyDisplay).toBe("block")
        expect(detailLayout.railBorderTop).toBe("1px")
        expect(detailLayout.railBorderLeft).toBe("0px")
        await page.getByText("Files", { exact: true }).scrollIntoViewIfNeeded()
        await expect(page.getByText("Files", { exact: true })).toBeVisible()
      } else {
        expect(detailLayout.bodyDisplay).toBe("grid")
        expect(detailLayout.railBorderTop).toBe("0px")
        expect(detailLayout.railBorderLeft).toBe("1px")
      }

      await expect(page.getByText(/\b(?:tokens?|spend|roi)\b/i)).toHaveCount(0)
    }
  })
}

test("Fleet running pulse respects reduced motion", async ({ page }) => {
  await mockFleet(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/v2/fleet")

  const animationName = await page
    .getByTestId("fleet-status-dot")
    .evaluate((dot) => getComputedStyle(dot).animationName)
  expect(animationName).toBe("none")
})
