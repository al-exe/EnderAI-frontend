import { expect, test } from "@playwright/test"

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test("/landing renders the expressive Taskforce demo page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/landing")

  await expect(page.getByTestId("landing-expressive")).toBeVisible()
  await expect(page.getByTestId("landing-demo-disclosure")).toContainText(
    "Names, events, and savings shown are example data.",
  )
  await expect(page.getByText("82.4M tokens")).toHaveCount(0)
  await expect(
    page.getByRole("heading", {
      name: /stop re-explaining your codebase/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByText("/tf Stripe is double-charging users on plan upgrades", {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    page.getByText("Selected profile: Jensen — Billing Reliability."),
  ).toBeVisible()
  await expect(page.getByText("session link ready →")).toBeVisible()
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveAttribute(
    "href",
    "/signup",
  )
  await expect(page.getByRole("link", { name: /log in/i })).toHaveAttribute(
    "href",
    "/login",
  )
})
