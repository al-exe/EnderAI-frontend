import type { ComponentType } from "react"

import AppearanceSettings from "@/components/UserSettings/Appearance"
import Billing from "@/components/UserSettings/Billing"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import ConnectAgent from "@/components/UserSettings/ConnectAgent"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import Organization from "@/components/UserSettings/Organization"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

export const settingsTabValues = [
  "my-profile",
  "organization",
  "appearance",
  "connect-agent",
  "billing",
  "password",
  "danger-zone",
] as const

export type SettingsTab = (typeof settingsTabValues)[number]

const tabsConfig: Array<{
  value: SettingsTab
  title: string
  component: ComponentType
}> = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "organization", title: "Organization", component: Organization },
  { value: "appearance", title: "Appearance", component: AppearanceSettings },
  { value: "connect-agent", title: "Connect agent", component: ConnectAgent },
  { value: "billing", title: "Billing", component: Billing },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
]

type UserSettingsPageProps = {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function UserSettingsPage({
  activeTab,
  onTabChange,
}: UserSettingsPageProps) {
  const { user: currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as SettingsTab)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto">
          {tabsConfig.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsConfig.map((tab) => (
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
