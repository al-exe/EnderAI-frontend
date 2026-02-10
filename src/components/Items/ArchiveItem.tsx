import { Archive } from "lucide-react"
import { useState } from "react"

import type { ItemPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"

interface ArchiveItemProps {
  item: ItemPublic
  onSuccess: () => void
}

// Demo-only action: there is no backend "archive" endpoint for Items.
const ArchiveItem = ({ item, onSuccess }: ArchiveItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { showSuccessToast } = useCustomToast()

  const onArchive = () => {
    showSuccessToast(`Archived "${item.title}" (demo)`)
    setIsOpen(false)
    onSuccess()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Archive />
        Archive item
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive item</DialogTitle>
          <DialogDescription>
            This is a demo action. Archiving does not currently change the item
            list.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={onArchive}>Archive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ArchiveItem
