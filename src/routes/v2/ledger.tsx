import { createFileRoute } from "@tanstack/react-router"

import { LedgerPage } from "@/components/V2/Ledger/LedgerPage"

export const Route = createFileRoute("/v2/ledger")({
  component: LedgerPage,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Ledger",
      },
    ],
  }),
})
