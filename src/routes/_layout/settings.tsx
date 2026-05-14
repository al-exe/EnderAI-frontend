import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { ComponentType } from "react"
import { z } from "zod"

import Billing from "@/components/UserSettings/Billing"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import ConnectAgent from "@/components/UserSettings/ConnectAgent"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

const tabValues = [
  "my-profile",
  "connect-agent",
  "billing",
  "password",
  "danger-zone",
] as const

type SettingsTab = (typeof tabValues)[number]

const searchSchema = z.object({
  tab: z.enum(tabValues).optional(),
})

const tabsConfig: Array<{
  value: SettingsTab
  title: string
  component: ComponentType
}> = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "connect-agent", title: "Connect agent", component: ConnectAgent },
  { value: "billing", title: "Billing", component: Billing },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
]

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
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const { tab } = Route.useSearch()
  const activeTab = tab ?? "my-profile"
  const finalTabs = tabsConfig

  if (!currentUser) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Account and local setup.</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          void navigate({
            to: "/settings",
            search: { tab: value as SettingsTab },
            replace: true,
          })
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="shrink-0">
          {finalTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {finalTabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="min-h-0 flex-1 overflow-y-auto pr-1"
          >
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
