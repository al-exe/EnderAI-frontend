import { expect, test } from "@playwright/test"

import { normalizeTaskforceDiscordUrl } from "../src/lib/taskforceExternalLinks"

test("Discord navigation accepts configured Discord destinations", () => {
  expect(normalizeTaskforceDiscordUrl("https://discord.gg/taskforce")).toBe(
    "https://discord.gg/taskforce",
  )
  expect(
    normalizeTaskforceDiscordUrl("https://discord.com/invite/taskforce"),
  ).toBe("https://discord.com/invite/taskforce")
})

test("Discord navigation stays hidden without a valid destination", () => {
  expect(normalizeTaskforceDiscordUrl(undefined)).toBeNull()
  expect(normalizeTaskforceDiscordUrl("")).toBeNull()
  expect(normalizeTaskforceDiscordUrl("javascript:alert(1)")).toBeNull()
  expect(
    normalizeTaskforceDiscordUrl("https://example.com/community"),
  ).toBeNull()
})
