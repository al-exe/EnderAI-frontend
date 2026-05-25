import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"

export const Route = createFileRoute("/_layout/admin")({
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/v2/library",
      })
    }

    throw redirect({ to: "/v2/admin" })
  },
  head: () => ({
    meta: [
      {
        title: "Admin",
      },
    ],
  }),
})
