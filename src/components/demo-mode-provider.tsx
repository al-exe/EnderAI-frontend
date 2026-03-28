import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type DemoModeProviderProps = {
  children: React.ReactNode
  storageKey?: string
}

type DemoModeProviderState = {
  isDemoMode: boolean
  setDemoMode: (enabled: boolean) => void
  toggleDemoMode: () => void
}

const initialState: DemoModeProviderState = {
  isDemoMode: false,
  setDemoMode: () => null,
  toggleDemoMode: () => null,
}

const DemoModeProviderContext =
  createContext<DemoModeProviderState>(initialState)

export function DemoModeProvider({
  children,
  storageKey = "enderai-demo-mode",
}: DemoModeProviderProps) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(storageKey) === "true"
  })

  const setDemoMode = useCallback(
    (enabled: boolean) => {
      window.localStorage.setItem(storageKey, String(enabled))
      startTransition(() => {
        setIsDemoMode(enabled)
      })
    },
    [storageKey],
  )

  const toggleDemoMode = useCallback(() => {
    setDemoMode(!isDemoMode)
  }, [isDemoMode, setDemoMode])

  const value = useMemo(
    () => ({
      isDemoMode,
      setDemoMode,
      toggleDemoMode,
    }),
    [isDemoMode, setDemoMode, toggleDemoMode],
  )

  return (
    <DemoModeProviderContext.Provider value={value}>
      {children}
    </DemoModeProviderContext.Provider>
  )
}

export const useDemoMode = () => {
  const context = useContext(DemoModeProviderContext)

  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider")
  }

  return context
}
