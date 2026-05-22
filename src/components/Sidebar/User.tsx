import { useQuery } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import { readMyOrganizationInvitations } from "@/api/organizations"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { getInitials } from "@/utils"

interface UserInfoProps {
  fullName?: string
  email?: string
  pendingInvitationCount?: number
}

function UserInfo({
  fullName,
  email,
  pendingInvitationCount = 0,
}: UserInfoProps) {
  const visibleInvitationCount =
    pendingInvitationCount > 9 ? "9+" : pendingInvitationCount.toString()

  return (
    <div className="flex items-center gap-2.5 w-full min-w-0 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:gap-0">
      <div className="relative shrink-0">
        <Avatar className="size-8 group-data-[collapsible=icon]:size-10">
          <AvatarFallback className="bg-zinc-600 text-white">
            {getInitials(fullName || "User")}
          </AvatarFallback>
        </Avatar>
        {pendingInvitationCount > 0 && (
          <span
            className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-sidebar"
            data-testid="organization-invite-badge"
            title={`${pendingInvitationCount} pending organization invitation${pendingInvitationCount === 1 ? "" : "s"}`}
          >
            {visibleInvitationCount}
          </span>
        )}
      </div>
      <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="text-sm font-medium truncate w-full">{fullName}</p>
        <p className="text-xs text-muted-foreground truncate w-full">{email}</p>
      </div>
    </div>
  )
}

export function User({ user }: { user: any }) {
  const { logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const invitationsQuery = useQuery({
    queryKey: ["my-organization-invitations"],
    queryFn: readMyOrganizationInvitations,
    enabled: Boolean(user),
    staleTime: 30_000,
  })

  if (!user) return null

  const pendingInvitationCount =
    invitationsQuery.data?.count ?? invitationsQuery.data?.data.length ?? 0

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }
  const handleLogout = async () => {
    logout()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              data-testid="user-menu"
            >
              <UserInfo
                fullName={user?.full_name}
                email={user?.email}
                pendingInvitationCount={pendingInvitationCount}
              />
              <ChevronsUpDown className="ml-auto size-[18px] text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <UserInfo
                fullName={user?.full_name}
                email={user?.email}
                pendingInvitationCount={pendingInvitationCount}
              />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <RouterLink to="/v2/settings" onClick={handleMenuClick}>
              <DropdownMenuItem>
                <Settings />
                User Settings
              </DropdownMenuItem>
            </RouterLink>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
