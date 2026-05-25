import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import {
  EXPERIMENTAL_MODE_STORAGE_KEY,
  readExperimentalModePreference,
  writeExperimentalModePreference,
} from "@/lib/experimentalMode"

type ExperimentalModeProviderProps = {
  children: React.ReactNode
  storageKey?: string
}

type ExperimentalModeProviderState = {
  isExperimentalMode: boolean
  setExperimentalMode: (enabled: boolean) => void
  toggleExperimentalMode: () => void
}

const initialState: ExperimentalModeProviderState = {
  isExperimentalMode: false,
  setExperimentalMode: () => null,
  toggleExperimentalMode: () => null,
}

const ExperimentalModeProviderContext =
  createContext<ExperimentalModeProviderState>(initialState)

export function ExperimentalModeProvider({
  children,
  storageKey = EXPERIMENTAL_MODE_STORAGE_KEY,
}: ExperimentalModeProviderProps) {
  const [isExperimentalMode, setIsExperimentalMode] = useState<boolean>(() =>
    readExperimentalModePreference(storageKey),
  )

  const setExperimentalMode = useCallback(
    (enabled: boolean) => {
      writeExperimentalModePreference(enabled, storageKey)
      startTransition(() => {
        setIsExperimentalMode(enabled)
      })
    },
    [storageKey],
  )

  const toggleExperimentalMode = useCallback(() => {
    setExperimentalMode(!isExperimentalMode)
  }, [isExperimentalMode, setExperimentalMode])

  const value = useMemo(
    () => ({
      isExperimentalMode,
      setExperimentalMode,
      toggleExperimentalMode,
    }),
    [isExperimentalMode, setExperimentalMode, toggleExperimentalMode],
  )

  return (
    <ExperimentalModeProviderContext.Provider value={value}>
      {children}
    </ExperimentalModeProviderContext.Provider>
  )
}

export const useExperimentalMode = () => {
  const context = useContext(ExperimentalModeProviderContext)

  if (context === undefined) {
    throw new Error(
      "useExperimentalMode must be used within an ExperimentalModeProvider",
    )
  }

  return context
}
