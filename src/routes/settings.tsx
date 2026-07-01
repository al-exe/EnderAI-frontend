import { createFileRoute, redirect } from "@tanstack/react-router"
import {
  legacySettingsTabValues,
  settingsTabValues,
  type LegacySettingsTab,
  type SettingsTab,
} from "@/components/UserSettings/UserSettingsPage"

type LegacySettingsSearch = {
  tab?: SettingsTab | LegacySettingsTab
}

function parseLegacySettingsSearch(
  search: Record<string, unknown>,
): LegacySettingsSearch {
  const tab = search.tab
  if (
    typeof tab === "string" &&
    (settingsTabValues as readonly string[]).includes(tab)
  ) {
    return { tab: tab as SettingsTab }
  }
  if (
    typeof tab === "string" &&
    (legacySettingsTabValues as readonly string[]).includes(tab)
  ) {
    return { tab: tab as LegacySettingsTab }
  }
  return {}
}

// Legacy V1 path — V1 (topics/cases/skills) was removed; keep a redirect so
// old links/bookmarks resolve into the V2 app.
export const Route = createFileRoute("/settings")({
  validateSearch: parseLegacySettingsSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/v2/settings",
      replace: true,
      ...(search.tab ? { search: { tab: search.tab } } : {}),
    })
  },
})
