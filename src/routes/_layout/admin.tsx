import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import { AdminUsersPage } from "@/components/Admin/AdminUsersPage"

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
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

function Admin() {
  return <AdminUsersPage />
}
