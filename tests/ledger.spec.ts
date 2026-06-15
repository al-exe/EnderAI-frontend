import { expect, type Page, test } from "@playwright/test"

const baseUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: false,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
  v2: true,
  subscription_tier: "max",
}

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockTaskforceAuth(page: Page, organizationId: string | null) {
  const currentUser = {
    ...baseUser,
    organization_id: organizationId,
    organization_role: "admin",
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
    if (url.pathname === "/api/v1/users/") {
      await route.fulfill({ json: { data: [currentUser], count: 1 } })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
  await page.route("**/api/v1/organizations/invitations", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })
}

function ledgerDetail(rawTranscriptAvailable: boolean) {
  return {
    session_id: "session-raw",
    actor_id: "user-1",
    actor_name: "Alex Lee",
    client: "codex",
    specialist_slug: null,
    specialist_name: null,
    specialist_href: null,
    documents: [],
    kinds: ["session.observed"],
    net_saved_tokens: 0,
    usd_amount: "0",
    event_count: 1,
    cross_boundary: false,
    occurred_at_first: "2026-06-12T20:00:00Z",
    occurred_at_last: "2026-06-12T20:01:00Z",
    title: "Ledger transcript polish",
    short_session_id: "session-",
    actor_handle: "alex",
    harness_label: "codex",
    harness_version: "1.0",
    model_id: "gpt-5",
    repo: "EnderAI",
    branch: "feature/ledger-polish",
    cwd: "/workspace/EnderAI",
    started_at: "2026-06-12T20:00:00Z",
    ended_at: "2026-06-12T20:01:00Z",
    duration_ms: 60000,
    imported_at: "2026-06-12T20:01:00Z",
    message_count: 1,
    command_count: 0,
    edit_count: 0,
    input_tokens: 100,
    output_tokens: 20,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    source: "observe",
    transcript_available: true,
    transcript_events: [
      {
        id: "event-prompt",
        kind: "prompt",
        occurred_at: "2026-06-12T20:00:00Z",
        role: "user",
        who: "Alex Lee",
        text: "Polish the Ledger.",
        cmd: null,
        exit_code: null,
        output: null,
        file: null,
        added: null,
        removed: null,
        note: null,
        repo: null,
      },
    ],
    raw_transcript_available: rawTranscriptAvailable,
    source_metadata: {},
  }
}

async function mockLedger(
  page: Page,
  { rawTranscriptAvailable }: { rawTranscriptAvailable: boolean },
) {
  await page.route("**/api/v1/v2/taskforce/ledger/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith("/raw-transcript")) {
      await route.fulfill({
        json: {
          session_id: "session-raw",
          events: [
            { role: "user", content: "Polish the Ledger." },
            { role: "assistant", content: "Ledger polished." },
          ],
        },
      })
      return
    }
    if (url.pathname.endsWith("/session-raw")) {
      await route.fulfill({ json: ledgerDetail(rawTranscriptAvailable) })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
  await page.route("**/api/v1/v2/taskforce/ledger?*", async (route) => {
    await route.fulfill({
      json: {
        scope: "organization",
        organization_id: "org-1",
        total: 0,
        limit: 50,
        offset: 0,
        rows: [],
      },
    })
  })
}

test("solo users see the team Ledger state without calling Ledger APIs", async ({
  page,
}) => {
  await mockTaskforceAuth(page, null)
  let ledgerRequests = 0
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/v2/taskforce/ledger")) {
      ledgerRequests += 1
    }
  })

  await page.goto("/v2/ledger")

  await expect(page.getByTestId("ledger-team-only")).toBeVisible()
  await expect(page.getByRole("link", { name: "Ledger" })).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Manage organization" }),
  ).toHaveAttribute("href", "/v2/settings?tab=organization")
  expect(ledgerRequests).toBe(0)
})

test("organization users can download an available transcript", async ({
  page,
}) => {
  await mockTaskforceAuth(page, "org-1")
  await mockLedger(page, { rawTranscriptAvailable: true })

  await page.goto("/v2/ledger?session_id=session-raw")

  await expect(page.getByRole("link", { name: "Ledger" })).toBeVisible()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download transcript" }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe("session-raw-transcript.json")
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual([
    { role: "user", content: "Polish the Ledger." },
    { role: "assistant", content: "Ledger polished." },
  ])
})

test("event deep links highlight the exact canonical Ledger event", async ({
  page,
}) => {
  await mockTaskforceAuth(page, "org-1")
  await mockLedger(page, { rawTranscriptAvailable: true })

  await page.goto("/v2/ledger?session_id=session-raw&event_id=event-prompt")

  await expect(page.locator('[data-highlighted="true"]')).toContainText(
    "Polish the Ledger.",
  )
})

test("sessions without canonical events show no transcript download control", async ({
  page,
}) => {
  await mockTaskforceAuth(page, "org-1")
  await mockLedger(page, { rawTranscriptAvailable: false })

  await page.goto("/v2/ledger?session_id=session-raw")

  await expect(page.getByText("Ledger transcript polish")).toBeVisible()
  await expect(
    page.getByRole("button", { name: /download transcript/i }),
  ).toHaveCount(0)
})
