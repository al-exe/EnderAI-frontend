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

  await page.goto("/")

  await expect(page).toHaveTitle("Home")
})

test("Topics page matches the primary pane width and truncates long left-table text", async ({
  page,
}) => {
  await mockAuth(page)

  await page.route("**/api/v1/topics/?skip=0&limit=25", async (route) => {
    await route.fulfill({
      json: {
        data: [
          {
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
            canonical_symbols: [],
            canonical_errors: [],
            canonical_symptoms: [],
            pinned_takeaways: [],
            ambiguity_notes: [],
            open_questions: [],
            negative_history: [],
            representative_case_ids: [],
            recent_case_ids: [],
            vocabulary: [],
            case_count: 1,
          },
        ],
        count: 1,
      },
    })
  })

  await page.route("**/api/v1/topics/topic-1", async (route) => {
    await route.fulfill({
      json: {
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
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        ambiguity_notes: [],
        open_questions: [],
        negative_history: [],
        representative_case_ids: [],
        recent_case_ids: [],
        vocabulary: [],
        case_count: 1,
      },
    })
  })

  await page.route("**/api/v1/topics/topic-1/rollup", async (route) => {
    await route.fulfill({
      json: {
        brief: "Topic summary",
        canonical_files: [tempPath],
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        negative_history: [],
        representative_case_ids: [],
        aliases: [],
        vocabulary: [],
        ambiguity_notes: [],
        open_questions: [],
        case_count: 1,
        recent_case_ids: [],
        updated_at: "2026-03-24T00:00:00Z",
      },
    })
  })

  await page.route(
    "**/api/v1/cases/?topic_id=topic-1&limit=20",
    async (route) => {
      await route.fulfill({ json: { data: [], count: 0 } })
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
    await tableHeader.evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe("none")
  expect(
    await firstHeaderCell.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe("rgba(0, 0, 0, 0)")

  const firstRow = page.locator("tbody tr").first()
  const topicTitle = firstRow.locator("td").first().locator("span").first()
  const workflowKey = firstRow.locator("td").first().locator("span").nth(1)

  await expect(topicTitle).toHaveText(/…$/)
  await expect(topicTitle).toHaveAttribute("title", longTopicTitle)
  await expect(workflowKey).toHaveText(/…$/)
  await expect(workflowKey).toHaveAttribute("title", longWorkflowKey)

  const canonicalFileChip = page.getByTitle(normalizedPath).first()
  await expect(canonicalFileChip).toContainText("…/Context_packs.py")
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
            refs: [],
            ts: "2026-03-24T00:00:00Z",
          },
        ],
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
  await expect(page.getByText("/Tmp/Enderai-Kan-119-Main")).toHaveCount(0)
})
