import { expect, test } from "@playwright/test"

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test("public docs render the overview and support deep links", async ({
  page,
}) => {
  await page.goto("/docs")

  await expect(page.getByTestId("docs-site")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Taskforce Documentation" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Connect your agent" }),
  ).toBeVisible()

  await page.goto("/docs/quickstart")

  await expect(
    page.getByRole("heading", {
      name: "Quickstart: connect your agent in 5 minutes",
    }),
  ).toBeVisible()
  await expect(
    page.getByText("Developer track · /docs/quickstart"),
  ).toBeVisible()
  await expect(page.getByText("bash", { exact: true }).first()).toBeVisible()
})

test("docs search navigates to indexed sections", async ({ page }) => {
  await page.goto("/docs")

  await page.getByRole("button", { name: /search the docs/i }).click()
  const search = page.getByPlaceholder("Search pages and sections…")
  await search.fill("confirmed-reuse event")
  await page
    .getByRole("button", { name: /the atom: a confirmed-reuse event/i })
    .click()

  await expect(page).toHaveURL(
    /\/docs\/metrics#the-atom-a-confirmed-reuse-event$/,
  )
  await expect(
    page.getByRole("heading", {
      name: "The atom: a confirmed-reuse event",
    }),
  ).toBeVisible()
})

test("docs code blocks copy and mobile navigation opens", async ({ page }) => {
  await page.goto("/docs/quickstart")

  const copyButton = page.getByRole("button", { name: "Copy" }).first()
  await copyButton.click()
  await expect(
    page.getByRole("button", { name: "Copied" }).first(),
  ).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Open documentation menu" }).click()
  await expect(
    page.getByRole("link", { name: /metrics & the roi ledger/i }),
  ).toBeVisible()
})

test("expressive landing links to documentation beside pricing", async ({
  page,
}) => {
  await page.goto("/landing")

  const documentation = page.getByRole("link", { name: "Documentation" })
  const pricing = page.getByRole("link", { name: "Pricing" })
  await expect(documentation).toHaveAttribute("href", "/docs")
  await expect(pricing).toHaveAttribute("href", "/pricing")
})
