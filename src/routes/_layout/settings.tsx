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

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      {
        title: "Settings",
      },
    ],
  }),
})

function UserSettings() {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()
  const activeTab = tab ?? "my-profile"

  return (
    <UserSettingsPage
      activeTab={activeTab}
      onTabChange={(nextTab: SettingsTab) => {
        void navigate({
          to: "/settings",
          search: { tab: nextTab },
          replace: true,
        })
      }}
    />
  )
}
