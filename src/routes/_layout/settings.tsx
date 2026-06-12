import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import {
  legacySettingsTabValues,
  normalizeSettingsTab,
  settingsTabValues,
} from "@/components/UserSettings/UserSettingsPage"

const searchSchema = z.object({
  tab: z
    .enum([...settingsTabValues, ...legacySettingsTabValues])
    .optional(),
})

export const Route = createFileRoute("/_layout/settings")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/v2/settings",
      search:
        search.tab !== undefined
          ? { tab: normalizeSettingsTab(search.tab) }
          : undefined,
    })
  },
  head: () => ({
    meta: [
      {
        title: "Settings",
      },
    ],
  }),
})
