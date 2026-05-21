import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { settingsTabValues } from "@/components/UserSettings/UserSettingsPage"

const searchSchema = z.object({
  tab: z.enum(settingsTabValues).optional(),
})

export const Route = createFileRoute("/_layout/settings")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/v2/settings",
      search: { tab: search.tab },
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
