import { UsersService, type UserPublic } from "@/client"

let cachedUser: UserPublic | null = null
let inflight: Promise<UserPublic> | null = null

/** Clears the in-memory session cache (e.g. on logout). */
export function invalidateTaskforceSession() {
  cachedUser = null
  inflight = null
}

/**
 * Returns the current user, deduping concurrent reads across route navigations.
 * TanStack Router still calls parent `beforeLoad` on child navigations; caching
 * avoids a flash of the v2 error boundary while `readUserMe` is in flight.
 */
export function readTaskforceSession(): Promise<UserPublic> {
  if (cachedUser) {
    return Promise.resolve(cachedUser)
  }

  if (!inflight) {
    inflight = UsersService.readUserMe()
      .then((user) => {
        cachedUser = user
        inflight = null
        return user
      })
      .catch((error) => {
        inflight = null
        throw error
      })
  }

  return inflight
}

export function peekTaskforceSession() {
  return cachedUser
}
