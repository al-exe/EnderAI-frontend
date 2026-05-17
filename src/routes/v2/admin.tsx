import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import { AdminUsersPage } from "@/components/Admin/AdminUsersPage"

export const Route = createFileRoute("/v2/admin")({
  component: TaskforceAdmin,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/v2/home",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Taskforce | Admin",
      },
    ],
  }),
})

function TaskforceAdmin() {
  return <AdminUsersPage />
}
