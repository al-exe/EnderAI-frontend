import { Save, Trash2 } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import type {
  AgentSpecialistDetail,
  AgentSpecialistUpdate,
} from "@/api/v2Agents"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )
}

export function EditProfileDialog({
  open,
  onOpenChange,
  agent,
  isSaving,
  isDeleting,
  onSubmit,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: AgentSpecialistDetail
  isSaving: boolean
  isDeleting: boolean
  onSubmit: (values: AgentSpecialistUpdate) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(agent.name)
  const [role, setRole] = useState(agent.role)
  const [description, setDescription] = useState(agent.short_description)
  const [tags, setTags] = useState(agent.domain_tags.join(", "))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Re-seed the form from the current profile each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(agent.name)
      setRole(agent.role)
      setDescription(agent.short_description)
      setTags(agent.domain_tags.join(", "))
      setConfirmingDelete(false)
    }
  }, [open, agent])

  const busy = isSaving || isDeleting
  const canSubmit = name.trim().length > 0 && role.trim().length > 0 && !busy

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      short_description: description.trim(),
      domain_tags: parseTags(tags),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update this specialist profile, or delete it permanently.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-name">Name</Label>
            <Input
              id="edit-profile-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Billing Specialist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-role">Role</Label>
            <Input
              id="edit-profile-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Stripe billing & webhooks"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-description">Focus</Label>
            <Textarea
              id="edit-profile-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One line on what this profile owns."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-tags">Domain tags</Label>
            <Input
              id="edit-profile-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="billing, payments, webhooks"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Used for routing and filtering.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  {isDeleting ? "Deleting" : "Confirm delete"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                <Save className="size-4" />
                {isSaving ? "Saving" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
