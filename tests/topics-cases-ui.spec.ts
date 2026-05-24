import { expect, type Page, test } from "@playwright/test"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
}

const longTopicTitle = `Topic ${"A".repeat(280)}`
const longWorkflowKey = `workflow-${"b".repeat(280)}`
const longCaseTitle = `Case ${"C".repeat(280)}`
const longCaseSummary = `Summary ${"d".repeat(280)}`
const longTopicName = `Topic ${"E".repeat(280)}`
const tempPath =
  "/Tmp/Enderai-Kan-119-Main/Demo/Full-Stack-Fastapi-Template/Backend/App/Api/Routes/Context_packs.py"
const normalizedPath = "Backend/App/Api/Routes/Context_packs.py"

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({ json: currentUser })
  })
}

test("Home route sets the browser tab title to Home", async ({ page }) => {
  await mockAuth(page)

  await page.goto("/home")

  await expect(page).toHaveTitle("Home")
})

test("Sidebar demo mode toggle scopes Topics/Cases requests", async ({
  page,
}) => {
  await mockAuth(page)

  const topicRequests: string[] = []
  const caseRequests: string[] = []

  await page.route("**/api/v1/topics/**", async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === "/api/v1/topics/") {
      topicRequests.push(route.request().url())
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }

    await route.fulfill({ status: 404, json: { detail: "Topic not found" } })
  })

  await page.route("**/api/v1/cases/**", async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === "/api/v1/cases/") {
      caseRequests.push(route.request().url())
      await route.fulfill({ json: { data: [], count: 0 } })
      return
    }

    await route.fulfill({ status: 404, json: { detail: "Case not found" } })
  })

  await page.goto("/topics")

  const demoToggle = page.getByTestId("demo-mode-toggle")
  const sidebarRail = page.getByTestId("sidebar-drag-rail").first()

  await expect(demoToggle).toBeVisible()
  await expect(page.getByTestId("sidebar-collapse-toggle")).toHaveCount(0)
  await expect(sidebarRail).toBeVisible()

  await expect
    .poll(() =>
      topicRequests.some(
        (url) => new URL(url).searchParams.get("demo") === null,
      ),
    )
    .toBeTruthy()

  await demoToggle.click()
  await expect(demoToggle).toHaveAttribute("aria-checked", "true")

  await expect
    .poll(() =>
      topicRequests.some(
        (url) => new URL(url).searchParams.get("demo") === "true",
      ),
    )
    .toBeTruthy()

  await page.getByRole("link", { name: "Cases" }).click()

  await expect
    .poll(() =>
      caseRequests.some(
        (url) => new URL(url).searchParams.get("demo") === "true",
      ),
    )
    .toBeTruthy()

  const activeBackground = await demoToggle.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  expect(activeBackground).not.toBe("rgba(0, 0, 0, 0)")

  const track = page.getByTestId("demo-mode-toggle-track")
  const thumb = page.getByTestId("demo-mode-toggle-thumb")
  const trackBox = await track.boundingBox()
  const thumbBox = await thumb.boundingBox()

  expect(trackBox).not.toBeNull()
  expect(thumbBox).not.toBeNull()
  expect(thumbBox!.height).toBeLessThan(trackBox!.height)
  expect(thumbBox!.width).toBeLessThan(trackBox!.height)
  expect(
    Math.abs(
      thumbBox!.y + thumbBox!.height / 2 - (trackBox!.y + trackBox!.height / 2),
    ),
  ).toBeLessThanOrEqual(1)

  await expect
    .poll(() =>
      demoToggle.evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    )
    .toBe(activeBackground)
})

test("Topics page matches the primary pane width and truncates long left-table text", async ({
  page,
}) => {
  await mockAuth(page)

  const statusUpdates: string[] = []
  const topicCaseSignals = {
    files: [
      "mobile/src/sync/optimisticMerge.ts",
      "backend/app/core/conflicts.py",
      "mobile/tests/sync/optimistic-merge.spec.ts",
    ],
    symbols: [
      "optimisticMerge",
      "reconcile_conflict",
      "ConflictResolutionError",
    ],
    errors: ["conflict reconciliation rejected client patch"],
    symptoms: [
      "notes visibly rewrote themselves after reconnect",
      "support tickets mentioned disappearing bullet points",
    ],
  }
  const topicCases = [
    {
      id: "case-1",
      topic_id: "topic-1",
      topic_title: longTopicTitle,
      title: "Optimistic merge backend mismatch",
      opened_at: "2026-03-24T00:00:00Z",
      updated_at: "2026-03-24T00:00:00Z",
      closed_at: null,
      status: "open",
      actor_id: null,
      source: null,
      input_summary: null,
      summary_current: "Investigating merge-rule mismatch.",
      files: topicCaseSignals.files.slice(0, 2),
      symbols: topicCaseSignals.symbols.slice(0, 2),
      errors: topicCaseSignals.errors,
      symptoms: topicCaseSignals.symptoms.slice(0, 1),
      commands: [
        {
          cmd: "pytest backend/tests/test_conflicts.py",
          purpose: "compare backend reconciliation to optimistic merge",
          salient_result: "backend rejected combinations the client accepted",
          ts: null,
        },
      ],
      hypotheses: [],
      changes: [],
      outcome: null,
      next_steps: [],
      context_pack_snapshot: {
        topic_id: "topic-1",
        case_id: "case-1",
        confidence: "high",
        alternative_topic_ids: [],
        topic_summary: null,
        matched_signals: [],
        representative_cases: [],
        recent_cases: [],
        relevant_cases: [],
        canonical_files: [],
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        ambiguities: [],
        questions: [],
        negative_history: [],
        builder_version: null,
        created_at: null,
      },
    },
    {
      id: "case-2",
      topic_id: "topic-1",
      topic_title: longTopicTitle,
      title: "Optimistic merge preview drift",
      opened_at: "2026-03-24T00:00:00Z",
      updated_at: "2026-03-24T00:00:00Z",
      closed_at: null,
      status: "open",
      actor_id: null,
      source: null,
      input_summary: null,
      summary_current: "Tracking frontend merge preview instability.",
      files: topicCaseSignals.files.slice(2),
      symbols: topicCaseSignals.symbols.slice(2),
      errors: [],
      symptoms: topicCaseSignals.symptoms.slice(1),
      commands: [
        {
          cmd: "pnpm test optimistic-merge.spec.ts",
          purpose: "reproduce jarring overwrite behavior",
          salient_result: "UI showed divergent merge previews",
          ts: null,
        },
      ],
      hypotheses: [],
      changes: [],
      outcome: null,
      next_steps: [],
      context_pack_snapshot: {
        topic_id: "topic-1",
        case_id: "case-2",
        confidence: "high",
        alternative_topic_ids: [],
        topic_summary: null,
        matched_signals: [],
        representative_cases: [],
        recent_cases: [],
        relevant_cases: [],
        canonical_files: [],
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        ambiguities: [],
        questions: [],
        negative_history: [],
        builder_version: null,
        created_at: null,
      },
    },
  ]
  let topic = {
    id: "topic-1",
    title: longTopicTitle,
    slug: "topic-1",
    description: "Topic description",
    aliases: [],
    status: "open",
    workflow_key: longWorkflowKey,
    owner_ids: [],
    created_at: "2026-03-24T00:00:00Z",
    updated_at: "2026-03-24T00:00:00Z",
    last_used_at: "2026-03-24T00:00:00Z",
    rollup_summary: "Topic summary",
    rollup_version: 1,
    canonical_files: [tempPath],
    canonical_symbols: ["reconcile_conflict"],
    canonical_errors: ["server merge checksum mismatch"],
    canonical_symptoms: ["offline note merge drift"],
    pinned_takeaways: ["Prefer server precedence for tombstones."],
    ambiguity_notes: ["Mobile offline edits still need product judgment."],
    open_questions: ["Should conflict previews expose both branches?"],
    negative_history: ["Do not rely on client timestamp ordering."],
    representative_case_ids: ["case-1"],
    recent_case_ids: ["case-1", "case-2"],
    vocabulary: ["merge", "conflict"],
    case_count: 2,
  }

  await page.route("**/api/v1/topics/?skip=0&limit=25", async (route) => {
    await route.fulfill({
      json: {
        data: [topic],
        count: 1,
      },
    })
  })

  await page.route("**/api/v1/topics/topic-1*", async (route) => {
    if (route.request().method() === "PATCH") {
      const patch = route.request().postDataJSON() as {
        title?: string
        description?: string | null
        status?: string
      }

      if (patch.status) statusUpdates.push(patch.status)

      topic = {
        ...topic,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      }

      await route.fulfill({ json: topic })
      return
    }

    await route.fulfill({ json: topic })
  })

  await page.route(
    "**/api/v1/cases/?topic_id=topic-1&limit=500",
    async (route) => {
      await route.fulfill({
        json: { data: topicCases, count: topicCases.length },
      })
    },
  )

  await page.goto("/topics")

  const globalSearchWidth = await page
    .getByTestId("global-search-container")
    .evaluate((element) => element.getBoundingClientRect().width)
  const primaryPaneWidth = await page
    .getByTestId("topics-primary-pane")
    .evaluate((element) => element.getBoundingClientRect().width)
  const tableHeader = page.locator("thead").first()
  const firstHeaderCell = tableHeader.locator("th").first()

  expect(Math.abs(globalSearchWidth - primaryPaneWidth)).toBeLessThanOrEqual(1)
  await expect(tableHeader).toHaveClass(/\bbg-muted\b/)
  await expect(tableHeader).not.toHaveClass(/bg-muted\/50/)
  expect(
    await tableHeader.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    ),
  ).not.toBe("none")
  expect(
    await firstHeaderCell.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe("rgba(0, 0, 0, 0)")

  const firstRow = page.locator("tbody tr").first()
  const topicTitle = firstRow.locator("td").first().locator("span").first()
  const topicSubtitle = firstRow.locator("td").first().locator("span").nth(1)

  await expect(topicTitle).toHaveText(/…$/)
  await expect(topicTitle).toHaveAttribute("title", longTopicTitle)
  await expect(topicSubtitle).toHaveText("Topic description")
  await expect(topicSubtitle).toHaveAttribute("title", "Topic description")
  await expect(page.getByText(longWorkflowKey)).toHaveCount(0)

  const topicStatusTrigger = page.getByTestId("topic-status-trigger")
  await expect(topicStatusTrigger).toContainText("Open")

  await topicStatusTrigger.click()
  await page.getByRole("option", { name: "Closed" }).click()

  await expect.poll(() => statusUpdates.at(-1)).toBe("closed")
  await expect(topicStatusTrigger).toContainText("Closed")

  await expect(page.getByTestId("topic-context-intelligence")).toContainText(
    "Topic notes",
  )
  await expect(page.getByTestId("topic-context-intelligence")).toContainText(
    "Promoted notes and signals for future briefings.",
  )
  await expect(
    page.getByText("Prefer server precedence for tombstones."),
  ).toBeVisible()
  await expect(
    page.getByText("Should conflict previews expose both branches?"),
  ).toBeVisible()
  await expect(
    page.getByText("Do not rely on client timestamp ordering."),
  ).toBeVisible()
  await expect(
    page.getByText("Mobile offline edits still need product judgment."),
  ).toBeVisible()
  await expect(page.getByText("1 representative")).toBeVisible()
  await expect(page.getByText("2 recent")).toBeVisible()

  await expect(page.getByText("Signals", { exact: true })).toBeVisible()
  await expect(page.getByText("Commands (2)")).toBeVisible()
  await expect(page.getByTitle("src/sync/optimisticMerge.ts")).toContainText(
    "…/optimisticMerge.ts",
  )
  await expect(page.getByTitle("backend/app/core/conflicts.py")).toContainText(
    "…/conflicts.py",
  )
  const errorSignal = page.getByText(
    "Conflict reconciliation rejected client patch",
  )
  const symptomSignal = page.getByText(
    "Notes visibly rewrote themselves after reconnect",
  )
  await expect(errorSignal).toBeVisible()
  await expect(symptomSignal).toBeVisible()
  await expect(errorSignal).toHaveText(
    "Conflict reconciliation rejected client patch",
  )
  await expect(symptomSignal).toHaveText(
    "Notes visibly rewrote themselves after reconnect",
  )
  await expect(
    page.getByText("pytest backend/tests/test_conflicts.py"),
  ).toBeVisible()
  await expect(
    page.getByText("pnpm test optimistic-merge.spec.ts"),
  ).toBeVisible()
})

test("Cases page truncates long table text and normalizes file chips", async ({
  page,
}) => {
  await mockAuth(page)

  await page.route("**/api/v1/cases/?skip=0&limit=25", async (route) => {
    await route.fulfill({
      json: {
        data: [
          {
            id: "case-1",
            topic_id: "topic-1",
            topic_title: longTopicName,
            title: longCaseTitle,
            opened_at: "2026-03-24T00:00:00Z",
            updated_at: "2026-03-24T00:00:00Z",
            closed_at: null,
            status: "done",
            actor_id: null,
            source: null,
            input_summary: null,
            summary_current: longCaseSummary,
            files: [tempPath],
            symbols: [],
            errors: [],
            symptoms: [],
            commands: [],
            hypotheses: [],
            changes: [],
            outcome: null,
            next_steps: [],
            context_pack_snapshot: {
              topic_id: "topic-1",
              case_id: "case-1",
              confidence: "high",
              alternative_topic_ids: [],
              topic_summary: null,
              matched_signals: [],
              representative_cases: [],
              recent_cases: [],
              relevant_cases: [],
              canonical_files: [],
              canonical_symbols: [],
              canonical_errors: [],
              canonical_symptoms: [],
              pinned_takeaways: [],
              ambiguities: [],
              questions: [],
              negative_history: [],
              builder_version: null,
              created_at: null,
            },
          },
        ],
        count: 1,
      },
    })
  })

  await page.route("**/api/v1/cases/case-1", async (route) => {
    await route.fulfill({
      json: {
        id: "case-1",
        topic_id: "topic-1",
        topic_title: longTopicName,
        title: longCaseTitle,
        opened_at: "2026-03-24T00:00:00Z",
        updated_at: "2026-03-24T00:00:00Z",
        closed_at: null,
        status: "done",
        actor_id: null,
        source: null,
        input_summary: null,
        summary_current: longCaseSummary,
        files: [tempPath],
        symbols: [],
        errors: [],
        symptoms: [],
        commands: [],
        hypotheses: [],
        changes: [
          {
            kind: "code",
            summary: "Normalize displayed file paths in case detail.",
            files: [tempPath],
            refs: ["PR-1019"],
            ts: "2026-03-24T00:00:00Z",
          },
        ],
        outcome: null,
        next_steps: [],
        context_pack_snapshot: {
          topic_id: "topic-1",
          case_id: "case-1",
          confidence: "high",
          alternative_topic_ids: ["topic-2"],
          topic_summary:
            "Context pack route investigations usually start with generated path normalization.",
          matched_signals: ["context_packs.py", "path normalization"],
          representative_cases: ["case-0"],
          recent_cases: ["case-0"],
          relevant_cases: [
            {
              case_id: "case-0",
              title: "Prior context pack routing fix",
              short_summary:
                "Normalized generated route filenames before display.",
              outcome: "Frontend now hides machine-local temp roots.",
              key_files: [tempPath],
              key_symbols: ["getSignalChipDisplay"],
              key_errors: ["raw temp path leaked into UI"],
              key_commands: [
                "bunx playwright test tests/topics-cases-ui.spec.ts",
              ],
              why_selected: "Shares the same Context Pack route path.",
            },
          ],
          canonical_files: [tempPath],
          canonical_symbols: ["getSignalChipDisplay"],
          canonical_errors: ["raw temp path leaked into UI"],
          canonical_symptoms: ["file chip showed machine-local path"],
          pinned_takeaways: ["Normalize generated file paths before display."],
          ambiguities: ["Generated route names vary by platform casing."],
          questions: ["Should path normalization run in the API layer?"],
          negative_history: ["Do not render raw temp workspace prefixes."],
          builder_version: "v1",
          created_at: "2026-03-24T00:00:00Z",
        },
      },
    })
  })

  await page.goto("/cases")

  const firstRow = page.locator("tbody tr").first()
  const title = firstRow.locator("td").first().locator("span").first()
  const summary = firstRow.locator("td").first().locator("span").nth(1)
  const topic = firstRow.locator("td").nth(1).locator("span")

  await expect(title).toHaveText(/…$/)
  await expect(title).toHaveAttribute("title", longCaseTitle)
  await expect(summary).toHaveText(/…$/)
  await expect(summary).toHaveAttribute("title", longCaseSummary)
  await expect(topic).toHaveText(/…$/)
  await expect(topic).toHaveAttribute("title", longTopicName)

  const normalizedFileChip = page.getByTitle(normalizedPath).first()
  await expect(normalizedFileChip).toContainText("…/Context_packs.py")
  const contextPack = page.getByTestId("case-context-pack")
  await expect(contextPack).toContainText("Context Pack")
  await expect(contextPack).toContainText(
    "Briefing captured when this Case started.",
  )
  await expect(contextPack).toContainText("high confidence")
  await expect(contextPack).toContainText("v1")
  await expect(contextPack).toContainText("path normalization")
  await expect(contextPack).toContainText(
    "Normalize generated file paths before display.",
  )
  await expect(contextPack).toContainText(
    "Should path normalization run in the API layer?",
  )
  await expect(contextPack).toContainText(
    "Do not render raw temp workspace prefixes.",
  )
  await expect(contextPack).toContainText("Prior context pack routing fix")
  await expect(contextPack).toContainText(
    "Shares the same Context Pack route path.",
  )
  await expect(page.getByRole("link", { name: "PR-1019" })).toHaveAttribute(
    "href",
    /github\.com\/search/,
  )
  await expect(page.getByText("/Tmp/Enderai-Kan-119-Main")).toHaveCount(0)
})
