import { expect, test } from "@playwright/test"

const currentUser = {
  id: "user-1",
  email: "alex@example.com",
  is_active: true,
  is_superuser: true,
  full_name: "Alex Lee",
  created_at: "2026-03-24T00:00:00Z",
}

test("Global search navigates to a case result and loads it by route param", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({ json: currentUser })
  })

  await page.route("**/api/v1/search/*", async (route) => {
    await route.fulfill({
      json: {
        topics: [],
        cases: [
          {
            kind: "case",
            id: "case-1",
            title: "Search-selected case",
            subtitle: "Global search rollout",
            excerpt:
              "Mixed search endpoint returns grouped Topic and Case results.",
            updated_at: "2026-03-24T00:00:00Z",
            route: "/cases",
            route_search: { caseId: "case-1" },
          },
        ],
        topic_count: 0,
        case_count: 1,
      },
    })
  })

  await page.route("**/api/v1/cases/?skip=0&limit=25", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.route("**/api/v1/cases/case-1", async (route) => {
    await route.fulfill({
      json: {
        id: "case-1",
        topic_id: "topic-1",
        topic_title: "Global search rollout",
        title: "Search-selected case",
        opened_at: "2026-03-24T00:00:00Z",
        updated_at: "2026-03-24T00:00:00Z",
        closed_at: null,
        status: "done",
        actor_id: null,
        source: null,
        input_summary: null,
        summary_current:
          "Mixed search endpoint returns grouped Topic and Case results.",
        files: [],
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
    })
  })

  await page.goto("/")
  await page.getByTestId("global-search-input").fill("Search")
  await expect(page.getByText("Search-selected case")).toBeVisible()

  await page.getByRole("button", { name: /Search-selected case/i }).click()

  await expect(page).toHaveURL(/\/cases\?caseId=case-1$/)
  await expect(
    page.getByRole("button", { name: "Search-selected case" }),
  ).toBeVisible()
  await expect(
    page
      .getByText(
        "Mixed search endpoint returns grouped Topic and Case results.",
      )
      .first(),
  ).toBeVisible()
})

test("Global search navigates to a topic result and loads it by route param", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({ json: currentUser })
  })

  await page.route("**/api/v1/search/*", async (route) => {
    await route.fulfill({
      json: {
        topics: [
          {
            kind: "topic",
            id: "topic-1",
            title: "Global search rollout",
            subtitle: "global-search",
            excerpt:
              "Track the new top-bar search experience across Topics and Cases.",
            updated_at: "2026-03-24T00:00:00Z",
            route: "/topics",
            route_search: { topicId: "topic-1" },
          },
        ],
        cases: [],
        topic_count: 1,
        case_count: 0,
      },
    })
  })

  await page.route("**/api/v1/topics/?skip=0&limit=25", async (route) => {
    await route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.route("**/api/v1/topics/topic-1", async (route) => {
    await route.fulfill({
      json: {
        id: "topic-1",
        title: "Global search rollout",
        slug: "global-search-rollout",
        description:
          "Track the new top-bar search experience across Topics and Cases.",
        aliases: ["header search"],
        status: "open",
        workflow_key: "global-search",
        owner_ids: [],
        created_at: "2026-03-24T00:00:00Z",
        updated_at: "2026-03-24T00:00:00Z",
        last_used_at: "2026-03-24T00:00:00Z",
        rollup_summary:
          "Track the new top-bar search experience across Topics and Cases.",
        rollup_version: 1,
        canonical_files: ["src/components/Search/GlobalSearchBar.tsx"],
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        ambiguity_notes: [],
        open_questions: [],
        negative_history: [],
        representative_case_ids: [],
        recent_case_ids: [],
        vocabulary: ["search", "header"],
        case_count: 1,
      },
    })
  })

  await page.route("**/api/v1/topics/topic-1/rollup", async (route) => {
    await route.fulfill({
      json: {
        brief:
          "Track the new top-bar search experience across Topics and Cases.",
        canonical_files: ["src/components/Search/GlobalSearchBar.tsx"],
        canonical_symbols: [],
        canonical_errors: [],
        canonical_symptoms: [],
        pinned_takeaways: [],
        negative_history: [],
        representative_case_ids: [],
        aliases: ["header search"],
        vocabulary: ["search", "header"],
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

  await page.goto("/")
  await page.getByTestId("global-search-input").fill("Global")
  await expect(page.getByText("Global search rollout")).toBeVisible()

  await page.getByRole("button", { name: /Global search rollout/i }).click()

  await expect(page).toHaveURL(/\/topics\?topicId=topic-1$/)
  await expect(
    page
      .getByText(
        "Track the new top-bar search experience across Topics and Cases.",
      )
      .first(),
  ).toBeVisible()
})
