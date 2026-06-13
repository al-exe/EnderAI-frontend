const DISCORD_HOSTS = new Set(["discord.com", "www.discord.com", "discord.gg"])

export function normalizeTaskforceDiscordUrl(
  value: string | undefined,
): string | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== "https:" || !DISCORD_HOSTS.has(url.hostname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
