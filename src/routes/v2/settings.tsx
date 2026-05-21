import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import {
  type SettingsTab,
  settingsTabValues,
  UserSettingsPage,
} from "@/components/UserSettings/UserSettingsPage"

const searchSchema = z.object({
  tab: z.enum(settingsTabValues).optional(),
})

export const Route = createFileRoute("/v2/settings")({
  component: TaskforceSettings,
  validateSearch: searchSchema,
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
  const activeTab = tab ?? "my-profile"

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
