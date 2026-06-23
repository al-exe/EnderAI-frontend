import { expect, test } from "@playwright/test"

const MOBILE_VIEWPORTS = [
  { height: 852, name: "iPhone 15 Pro", width: 393 },
  { height: 874, name: "iPhone 17 Pro", width: 402 },
] as const

const CAPABILITIES = ["Sessions", "Profiles", "Library", "Ledger", "Metrics"]

for (const viewport of MOBILE_VIEWPORTS) {
  test(`${viewport.name} keeps the landing page within the mobile viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/landing")

    await expect(page.getByTestId("landing-redesign")).toBeVisible()

    const pageSize = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    expect(pageSize.documentWidth).toBeLessThanOrEqual(pageSize.viewportWidth)

    const heroActions = page
      .locator("section")
      .first()
      .getByRole("link", { name: /start free|open taskforce/i })

    await expect(heroActions).toHaveCount(2)
    for (const action of await heroActions.all()) {
      const box = await action.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(viewport.width - 42)
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        viewport.width,
      )
    }

    const terminal = page.getByTestId("landing-terminal")
    for (const capability of CAPABILITIES) {
      const tab = page.getByRole("tab", { name: capability })
      await expect(tab).toHaveCSS("min-height", "44px")
      await tab.click()

      const activeScene = terminal.locator(
        '[role="tabpanel"][aria-hidden="false"]',
      )
      await expect(activeScene).toBeVisible()
      expect(
        await activeScene.evaluate(
          (scene) => scene.scrollWidth <= scene.clientWidth + 1,
        ),
      ).toBe(true)
    }

    for (const link of await page.locator("footer a").all()) {
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })
}
