import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CircleOff,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react"
import { type FormEvent, useState } from "react"

import {
  type AgentSpecialistSummary,
  deleteAgent,
  updateAgent,
} from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"

export function AgentProfileCardActionsMenu({
  agent,
}: {
  agent: AgentSpecialistSummary
}) {
  const { isDemoMode } = useDemoMode()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(agent.name)

  const invalidateAgents = () => {
    void queryClient.invalidateQueries({ queryKey: ["v2-agents", isDemoMode] })
    void queryClient.invalidateQueries({
      queryKey: ["v2-agent", agent.slug, isDemoMode],
    })
  }

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; status?: "active" | "archived" }) =>
      updateAgent(agent.slug, body, { demo: isDemoMode }),
    onSuccess: () => {
      invalidateAgents()
    },
    onError: () => {
      showErrorToast("Could not update profile.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgent(agent.slug, { demo: isDemoMode }),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ["v2-agent", agent.slug, isDemoMode],
      })
      invalidateAgents()
      setDeleteOpen(false)
      showSuccessToast("Profile deleted.")
    },
    onError: () => {
      showErrorToast("Could not delete profile.")
    },
  })

  const busy = updateMutation.isPending || deleteMutation.isPending
  const isActive = agent.status === "active"

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === agent.name || busy) return
    updateMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setRenameOpen(false)
          showSuccessToast("Profile renamed.")
        },
      },
    )
  }

  const toggleActive = () => {
    if (busy) return
    const nextStatus = isActive ? "archived" : "active"
    updateMutation.mutate(
      { status: nextStatus },
      {
        onSuccess: () => {
          showSuccessToast(
            nextStatus === "active" ? "Profile activated." : "Profile deactivated.",
          )
        },
      },
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Open options for ${agent.name}`}
            className="size-6 shrink-0"
            data-testid={`profile-card-menu-${agent.slug}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={() => {
              setRenameValue(agent.name)
              setRenameOpen(true)
            }}
          >
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          {isActive ? (
            <DropdownMenuItem
              disabled={busy}
              onSelect={toggleActive}
              data-testid={`profile-card-deactivate-${agent.slug}`}
            >
              <CircleOff className="size-4" />
              Make inactive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={busy}
              onSelect={toggleActive}
              data-testid={`profile-card-activate-${agent.slug}`}
            >
              <Power className="size-4" />
              Make active
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!busy) setRenameOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename profile</DialogTitle>
            <DialogDescription>
              Update how this profile appears in your roster.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitRename}>
            <div className="space-y-2">
              <Label htmlFor={`rename-profile-${agent.slug}`}>Name</Label>
              <Input
                id={`rename-profile-${agent.slug}`}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  !renameValue.trim() ||
                  renameValue.trim() === agent.name
                }
              >
                {updateMutation.isPending ? "Saving" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!busy) setDeleteOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete profile</DialogTitle>
            <DialogDescription>
              Permanently delete {agent.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              data-testid={`profile-card-delete-confirm-${agent.slug}`}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
