import { useCallback, useEffect, useRef } from "react"

/** Matches `.pulse` / `fleet-pulse` in FleetPage.module.css */
export const FLEET_PULSE_MS = 2600

function fleetPulseDelaySec(now = Date.now()) {
  return -((now % FLEET_PULSE_MS) / 1000)
}

function bindFleetPulseSync(node: HTMLElement) {
  const apply = () => {
    node.style.setProperty("--fleet-pulse-delay", `${fleetPulseDelaySec()}s`)
  }

  apply()
  const intervalId = window.setInterval(apply, FLEET_PULSE_MS)
  const onVisibility = () => {
    if (document.visibilityState === "visible") apply()
  }
  document.addEventListener("visibilitychange", onVisibility)

  return () => {
    window.clearInterval(intervalId)
    document.removeEventListener("visibilitychange", onVisibility)
  }
}

/** Keep every `.pulse` indicator on the node in phase with wall clock. */
export function useFleetPulseSync() {
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  return useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (!node) return
    cleanupRef.current = bindFleetPulseSync(node)
  }, [])
}
