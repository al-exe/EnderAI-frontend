import { useQuery } from "@tanstack/react-query"
import type { ComponentType } from "react"

import { readMyOrganizationInvitations } from "@/api/organizations"
import { PendingInvitationBadge } from "@/components/Common/PendingInvitationBadge"
import AppearanceSettings from "@/components/UserSettings/Appearance"
import Billing from "@/components/UserSettings/Billing"
import ConnectAgent from "@/components/UserSettings/ConnectAgent"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import Organization from "@/components/UserSettings/Organization"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

export const settingsTabValues = [
  "account",
  "organization",
  "connect-agent",
  "billing",
  "appearance",
  "danger-zone",
] as const

export type SettingsTab = (typeof settingsTabValues)[number]

/** @deprecated Old tab slugs kept for URL redirects. */
export const legacySettingsTabValues = ["my-profile", "password"] as const

export type LegacySettingsTab = (typeof legacySettingsTabValues)[number]

export function normalizeSettingsTab(
  tab: SettingsTab | LegacySettingsTab | undefined,
): SettingsTab {
  if (tab === "my-profile" || tab === "password") {
    return "account"
  }
  return tab ?? "account"
}

const tabsConfig: Array<{
  value: SettingsTab
  title: string
  component: ComponentType
}> = [
  { value: "account", title: "Account", component: UserInformation },
  { value: "organization", title: "Organization", component: Organization },
  { value: "connect-agent", title: "Connect agent", component: ConnectAgent },
  { value: "billing", title: "Billing", component: Billing },
  { value: "appearance", title: "Appearance", component: AppearanceSettings },
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
  const invitationsQuery = useQuery({
    queryKey: ["my-organization-invitations"],
    queryFn: readMyOrganizationInvitations,
    enabled: Boolean(currentUser),
    staleTime: 30_000,
  })

  if (!currentUser) {
    return null
  }

  const pendingInvitationCount =
    invitationsQuery.data?.count ?? invitationsQuery.data?.data.length ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden -mb-6 md:-mb-8">
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
              <span>{tab.title}</span>
              {tab.value === "organization" && (
                <PendingInvitationBadge
                  count={pendingInvitationCount}
                  testId="organization-tab-invite-badge"
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsConfig.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="min-h-0 flex-1 overflow-y-auto pr-1 pb-6 md:pb-8"
          >
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
