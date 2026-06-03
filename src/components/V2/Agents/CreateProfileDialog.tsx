import { Plus } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

import type { AgentSpecialistCreate } from "@/api/v2Agents"
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

export function CreateProfileDialog({
  open,
  onOpenChange,
  isCreating,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isCreating: boolean
  onSubmit: (values: AgentSpecialistCreate) => void
}) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    if (open) {
      setName("")
      setRole("")
      setDescription("")
      setTags("")
    }
  }, [open])

  const canSubmit = name.trim().length > 0 && role.trim().length > 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isCreating) return
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      short_description: description.trim() || undefined,
      domain_tags: parseTags(tags),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New profile</DialogTitle>
          <DialogDescription>
            Create a specialist profile. You can refine its instructions and
            linked knowledge after it's created.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-profile-name">Name</Label>
            <Input
              id="new-profile-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Billing Specialist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-profile-role">Role</Label>
            <Input
              id="new-profile-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Stripe billing & webhooks"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-profile-description">Focus</Label>
            <Textarea
              id="new-profile-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One line on what this profile owns."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-profile-tags">Domain tags</Label>
            <Input
              id="new-profile-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="billing, payments, webhooks"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Used for routing and filtering.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isCreating}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isCreating}>
              <Plus className="size-4" />
              {isCreating ? "Creating" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
