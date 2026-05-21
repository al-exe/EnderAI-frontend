import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"

export type PersistentStorage = "local" | "session"

type Options<T> = {
  /**
   * Where to persist the value. Defaults to localStorage (cross-session).
   * Use "session" for in-tab-only state that should still survive a route
   * change or a remount.
   */
  storage?: PersistentStorage
  /**
   * Custom validator/coercer for the value pulled from storage. Return
   * `undefined` to fall back to the initial value (e.g. if the stored shape
   * looks wrong after a refactor). Defaults to a passthrough.
   */
  deserialize?: (raw: unknown) => T | undefined
}

const PREFIX = "taskforce."

function namespacedKey(key: string): string {
  return key.startsWith(PREFIX) ? key : `${PREFIX}${key}`
}

function getStorage(storage: PersistentStorage): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return storage === "local" ? window.localStorage : window.sessionStorage
  } catch {
    // Storage access can throw in some sandboxed contexts (Safari private,
    // strict CSPs, etc.). Fall back to in-memory state in that case.
    return null
  }
}

function readInitial<T>(
  fullKey: string,
  fallback: T | (() => T),
  storage: PersistentStorage,
  deserialize: (raw: unknown) => T | undefined,
): T {
  const compute = (): T =>
    typeof fallback === "function" ? (fallback as () => T)() : fallback
  const store = getStorage(storage)
  if (!store) return compute()
  try {
    const raw = store.getItem(fullKey)
    if (raw === null) return compute()
    const parsed = JSON.parse(raw)
    const coerced = deserialize(parsed)
    return coerced === undefined ? compute() : coerced
  } catch {
    return compute()
  }
}

/**
 * `useState` that mirrors its value to `localStorage` (default) or
 * `sessionStorage` under a namespaced key. Safe to use for user-facing
 * preferences that should survive a reload.
 *
 * Use a stable `key`. Treat the key as the on-disk schema; if you change the
 * shape later, either pick a new key or pass a `deserialize` that can reject
 * the old value.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  options: Options<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const { storage = "local", deserialize = (raw) => raw as T } = options
  const fullKey = namespacedKey(key)

  const [value, setValue] = useState<T>(() =>
    readInitial(fullKey, initial, storage, deserialize),
  )

  const storageRef = useRef(storage)
  const keyRef = useRef(fullKey)

  useEffect(() => {
    storageRef.current = storage
    keyRef.current = fullKey
  }, [storage, fullKey])

  useEffect(() => {
    const store = getStorage(storageRef.current)
    if (!store) return
    try {
      store.setItem(keyRef.current, JSON.stringify(value))
    } catch {
      // Quota exceeded or storage disabled mid-session — drop silently rather
      // than disrupt the UI.
    }
  }, [value])

  return [value, setValue]
}

/**
 * Convenience: same as `usePersistentState` but locked to sessionStorage,
 * for prefs that should reset when the user closes the tab.
 */
export function useSessionState<T>(
  key: string,
  initial: T | (() => T),
  options: Omit<Options<T>, "storage"> = {},
): [T, Dispatch<SetStateAction<T>>] {
  return usePersistentState(key, initial, { ...options, storage: "session" })
}

/**
 * Erase a single persisted preference. Useful for resetting state from a
 * settings page or test fixture.
 */
export function clearPersistedValue(
  key: string,
  storage: PersistentStorage = "local",
): void {
  const store = getStorage(storage)
  if (!store) return
  try {
    store.removeItem(namespacedKey(key))
  } catch {
    // ignore
  }
}

/**
 * Stable helper so callers can compose keys without sprinkling string
 * concatenation everywhere. Returns the fully-namespaced key (matches what
 * `usePersistentState` writes under the hood).
 */
export function persistedKey(...segments: string[]): string {
  return namespacedKey(segments.join("."))
}

/**
 * Build a typed `deserialize` for string-union preferences. Returns
 * `undefined` whenever the stored value isn't one of the allowed values,
 * which falls the hook back to its initial value.
 */
export function enumDeserializer<T extends string>(
  allowed: readonly T[],
): (raw: unknown) => T | undefined {
  return (raw) => {
    if (typeof raw !== "string") return undefined
    return allowed.includes(raw as T) ? (raw as T) : undefined
  }
}
