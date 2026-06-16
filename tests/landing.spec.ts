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
  await expect(page.getByText("taskforce")).toBeVisible()

  for (const heading of [
    "Orchestration",
    "Agent profiles",
    "Self-updating documents",
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

  await expect(
    page.getByRole("link", { name: /start free/i }).first(),
  ).toHaveAttribute("href", "/signup")
  await expect(
    page.getByRole("link", { name: /open taskforce/i }).first(),
  ).toHaveAttribute("href", "/login")
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
