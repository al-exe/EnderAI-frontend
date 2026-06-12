import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import {
  legacySettingsTabValues,
  normalizeSettingsTab,
  type SettingsTab,
  settingsTabValues,
  UserSettingsPage,
} from "@/components/UserSettings/UserSettingsPage"

const searchSchema = z.object({
  tab: z
    .enum([...settingsTabValues, ...legacySettingsTabValues])
    .optional(),
})

export const Route = createFileRoute("/v2/settings")({
  component: TaskforceSettings,
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const activeTab = normalizeSettingsTab(search.tab)
    if (search.tab !== undefined && search.tab !== activeTab) {
      throw redirect({
        to: "/v2/settings",
        search: { tab: activeTab },
        replace: true,
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Settings",
      },
    ],
  }),
})

function TaskforceSettings() {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()
  const activeTab = normalizeSettingsTab(tab)

  return (
    <UserSettingsPage
      activeTab={activeTab}
      onTabChange={(nextTab: SettingsTab) => {
        void navigate({
          to: "/v2/settings",
          search: { tab: nextTab },
          replace: true,
        })
      }}
    />
  )
}
