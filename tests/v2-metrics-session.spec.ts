import { expect, type Page, test } from "@playwright/test"

import { mockV2Documents } from "./fixtures/v2-documents"

const sessionId = "123e4567-e89b-12d3-a456-426614174000"

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

function metricDefinition(
  name: string,
  displayName: string,
  format: "compact-int" | "usd" | "ratio" | "count",
  unit: "tokens" | "usd" | "ratio" | "count",
) {
  return {
    name,
    display_name: displayName,
    unit,
    description: `${displayName} description`,
    presentation: { format, trend: false, icon: null },
  }
}

function metricValue(total: string) {
  return {
    total,
    delta_vs_prev_window: null,
    series: [{ day: "2026-05-24", value: total }],
    breakdown_by_source: [
      { key: "reuse", label: "Reuse", tokens: Number(total) || 0, usd: "0" },
    ],
    top_models: [
      { key: "claude-opus-4-7", label: "Claude Opus", tokens: 100, usd: "0" },
    ],
  }
}

function crossBoundarySavingsValue() {
  return {
    total: "750",
    delta_vs_prev_window: null,
    series: [],
    breakdown_by_source: [
      {
        key: "cross_boundary",
        label: "Cross-boundary",
        tokens: 750,
        usd: "0.08",
      },
      {
        key: "same_boundary",
        label: "Same owner/tool",
        tokens: 250,
        usd: "0.03",
      },
    ],
    top_models: null,
  }
}

async function mockMetricsPage(
  page: Page,
  options: { experimental?: boolean } = {},
) {
  await page.addInitScript((experimental) => {
    window.localStorage.setItem("access_token", "test-token")
    if (experimental) {
      window.localStorage.setItem("taskforce-experimental-mode", "true")
    } else {
      window.localStorage.removeItem("taskforce-experimental-mode")
    }
  }, options.experimental ?? false)

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

  await page.route("**/api/v1/v2/metrics/definitions", async (route) => {
    await route.fulfill({
      json: {
        data: [
          metricDefinition(
            "tokens_saved",
            "Tokens Saved",
            "compact-int",
            "tokens",
          ),
          metricDefinition("usd_saved", "USD Saved", "usd", "usd"),
          metricDefinition("reuse_rate", "Reuse Rate", "ratio", "ratio"),
          metricDefinition(
            "tokens_consumed",
            "Tokens Consumed",
            "compact-int",
            "tokens",
          ),
          metricDefinition("usd_consumed", "USD Consumed", "usd", "usd"),
          metricDefinition(
            "documents_touched",
            "Documents Touched",
            "count",
            "count",
          ),
          metricDefinition(
            "cross_boundary_reuse_rate",
            "Boundary-Crossing Reuse",
            "ratio",
            "ratio",
          ),
          metricDefinition(
            "cross_boundary_tokens_saved",
            "Boundary-Crossing Savings",
            "compact-int",
            "tokens",
          ),
        ],
      },
    })
  })

  await page.route("**/api/v1/v2/metrics?*", async (route) => {
    await route.fulfill({
      json: {
        window: "7d",
        from: "2026-05-18T00:00:00Z",
        to: "2026-05-24T00:00:00Z",
        scope: "personal",
        is_demo: false,
        metrics: {
          tokens_saved: metricValue("1000"),
          usd_saved: metricValue("1.23"),
          reuse_rate: metricValue("0.5"),
          tokens_consumed: metricValue("2000"),
          usd_consumed: metricValue("0.25"),
          documents_touched: metricValue("4"),
          cross_boundary_reuse_rate: metricValue("0.25"),
          cross_boundary_tokens_saved: crossBoundarySavingsValue(),
        },
      },
    })
  })

  await page.route("**/api/v1/v2/taskforce/ledger?*", async (route) => {
    await route.fulfill({
      json: {
        scope: "organization",
        organization_id: "org-1",
        total: 0,
        limit: 10,
        offset: 0,
        rows: [],
      },
    })
  })

  await page.route("**/api/v1/v2/taskforce/session-log?*", async (route) => {
    await route.fulfill({
      json: {
        session_id: sessionId,
        entries: [
          {
            document_id: "doc-1",
            title: "Bridge incident investigation",
            score: 0.92,
            confidence_band: "high",
            match_reasons: ["Title overlap"],
            summary_markdown: "Bridge summary",
            occurred_at: "2026-05-23T19:00:00Z",
            query_id: "query-1",
            net_saved_tokens: 2500,
          },
          {
            document_id: "doc-2",
            title: "Metrics polish follow-up",
            score: 0.64,
            confidence_band: "medium",
            match_reasons: ["Prompt overlap"],
            summary_markdown: "Metrics summary",
            occurred_at: "2026-05-23T19:04:00Z",
            query_id: "query-2",
            net_saved_tokens: 1718,
          },
        ],
      },
    })
  })

  await mockV2Documents(page)
}

test("metrics page shows session-scoped savings when session_id is present", async ({
  page,
}) => {
  await mockMetricsPage(page)

  await page.route(
    "**/api/v1/v2/taskforce/session-savings?*",
    async (route) => {
      await route.fulfill({
        json: {
          session_id: sessionId,
          doc_count: 2,
          net_saved_tokens: 4218,
          usd_saved: "0.42",
          pricing_model_id: "claude-opus-4-7",
          occurred_at_first: "2026-05-23T19:00:00Z",
          occurred_at_last: "2026-05-23T19:04:00Z",
        },
      })
    },
  )

  await page.goto(`/v2/metrics?session_id=${sessionId}`)

  await expect(page.getByTestId("metrics-session-filter-banner")).toContainText(
    "123e4567",
  )
  await expect(
    page.getByText("Tokens Saved", { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText("4.2K", { exact: true }).first()).toBeVisible()
  await expect(
    page.getByText("USD Saved", { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText("$0.42", { exact: true }).first()).toBeVisible()
  await expect(
    page.getByText("Documents Consulted", { exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Bridge incident investigation")).toBeVisible()
  await expect(page.getByText("2,500")).toBeVisible()

  await page.getByRole("link", { name: /view all metrics/i }).click()
  await expect(page).toHaveURL(/\/v2\/metrics$/)
})

test("experimental mode shows expressive session-scoped metrics", async ({
  page,
}) => {
  await mockMetricsPage(page, { experimental: true })

  await page.route(
    "**/api/v1/v2/taskforce/session-savings?*",
    async (route) => {
      await route.fulfill({
        json: {
          session_id: sessionId,
          doc_count: 2,
          net_saved_tokens: 4218,
          usd_saved: "0.00423",
          pricing_model_id: "claude-opus-4-7",
          occurred_at_first: "2026-05-23T19:00:00Z",
          occurred_at_last: "2026-05-23T19:04:00Z",
        },
      })
    },
  )

  await page.goto(`/v2/metrics?session_id=${sessionId}`)

  await expect(
    page.getByTestId("metrics-experimental-session-page"),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: /this session saved 4\.2k tokens/i }),
  ).toBeVisible()
  await expect(page.getByText("$0.00423 estimated savings")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Bridge incident investigation" }),
  ).toHaveAttribute("href", /\/v2\/library\/doc-1$/)
  await expect(
    page.getByRole("heading", { name: "Documents consulted" }),
  ).toBeVisible()
  await expect(page.getByText("claude-opus-4-7", { exact: true })).toBeVisible()
})

test("metrics page keeps aggregate dashboard without session_id", async ({
  page,
}) => {
  let sessionSavingsRequests = 0
  await mockMetricsPage(page)
  await page.route(
    "**/api/v1/v2/taskforce/session-savings?*",
    async (route) => {
      sessionSavingsRequests += 1
      await route.fulfill({ status: 500, json: { detail: "Unexpected call" } })
    },
  )

  await page.goto("/v2/metrics")

  await expect(page.getByTestId("metrics-session-filter-banner")).toHaveCount(0)
  await expect(page.getByText("Reuse Rate", { exact: true })).toBeVisible()
  await expect(page.getByText("1K", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("$1.23", { exact: true }).first()).toBeVisible()
  await expect(page.getByTestId("cross-boundary-metric")).toContainText(
    "Boundary-Crossing Reuse",
  )
  await page.getByTestId("cross-boundary-metric").click()
  await expect(page).toHaveURL(/\/v2\/ledger\?cross_boundary=true$/)
  expect(sessionSavingsRequests).toBe(0)
})

test("experimental mode shows expressive aggregate metrics", async ({
  page,
}) => {
  let sessionSavingsRequests = 0
  await mockMetricsPage(page, { experimental: true })
  await page.route(
    "**/api/v1/v2/taskforce/session-savings?*",
    async (route) => {
      sessionSavingsRequests += 1
      await route.fulfill({ status: 500, json: { detail: "Unexpected call" } })
    },
  )

  await page.goto("/v2/metrics")

  await expect(page.getByTestId("metrics-experimental-page")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: /you saved 1k tokens this week/i }),
  ).toBeVisible()
  await expect(page.getByText("Saved / used")).toBeVisible()
  await expect(page.getByTestId("cross-boundary-metric")).toContainText(
    "Boundary-Crossing Reuse",
  )
  await expect(page.getByText("Top models by tokens used")).toBeVisible()
  await expect(page.getByText("Documents Touched")).toBeVisible()
  await expect(page.getByTestId("metrics-session-filter-banner")).toHaveCount(0)
  expect(sessionSavingsRequests).toBe(0)
})

test("metrics methodology route renders from direct URL and metrics link", async ({
  page,
}) => {
  await mockMetricsPage(page)

  await page.goto("/v2/metrics/methodology")
  await expect(page).toHaveURL(/\/v2\/metrics\/methodology$/)
  await expect(
    page.getByRole("heading", { name: /how we calculate savings/i }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /back to metrics/i }),
  ).toBeVisible()

  await page.getByRole("link", { name: /back to metrics/i }).click()
  await expect(page).toHaveURL(/\/v2\/metrics$/)

  await page
    .getByRole("link", { name: /learn how we calculate savings/i })
    .click()
  await expect(page).toHaveURL(/\/v2\/metrics\/methodology$/)
  await expect(
    page.getByRole("heading", { name: /how we calculate savings/i }),
  ).toBeVisible()
  await expect(page.getByText("derived, not asserted")).toBeVisible()
  await expect(page.locator("pre code")).toContainText("net_saved_tokens")
  await expect(page.getByRole("listitem").first()).toBeVisible()
})
