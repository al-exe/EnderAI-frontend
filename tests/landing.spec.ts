import { expect, test } from "@playwright/test"

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test("/landing renders the redesigned Taskforce landing page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/landing")

  await expect(page.getByTestId("landing-redesign")).toBeVisible()
  await expect(page.getByText("82.4M tokens")).toHaveCount(0)
  await expect(
    page.getByRole("heading", {
      name: /stop losing track.*of your agents/i,
    }),
  ).toBeVisible()
  await expect(page.getByText("tf · taskforce", { exact: true })).toBeVisible()

  for (const heading of [
    "Fleet visibility",
    "Agent identities",
    "Self-maintaining documents",
    "Audit trail",
    "Proven ROI",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible()
  }

  await page.getByRole("tab", { name: "Profiles" }).click()
  await expect(
    page.getByRole("heading", {
      name: /stop re-briefing.*every agent/i,
    }),
  ).toBeVisible()

  // The app isn't hosted, so the landing page must not link into it.
  await expect(
    page.locator('a[href="/login"], a[href="/signup"], a[href="/pricing"]'),
  ).toHaveCount(0)
})

test("/pricing uses sentence-case calmer mono eyebrows", async ({ page }) => {
  await page.goto("/pricing")

  await expect(page.getByTestId("public-pricing")).toBeVisible()
  await expect(page.getByTestId("public-pricing-eyebrow")).toHaveCSS(
    "text-transform",
    "none",
  )
  for (const eyebrow of await page.getByTestId("public-plan-eyebrow").all()) {
    await expect(eyebrow).toHaveCSS("text-transform", "none")
  }
})
