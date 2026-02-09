import { Archive } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"

interface ArchiveItemProps {
  id: string
  onSuccess: () => void
}

// UI-only action for now. When a backend endpoint exists, swap the onSubmit body
// for a mutation and invalidate queries like DeleteItem/EditItem.
const ArchiveItem = ({ id, onSuccess }: ArchiveItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { showSuccessToast } = useCustomToast()
  const { handleSubmit } = useForm()
  const [isPending, setIsPending] = useState(false)

  const onSubmit = async () => {
    setIsPending(true)
    try {
      // Placeholder behavior: we currently don't have an archive API.
      showSuccessToast(`Item archived (UI only): ${id}`)
      setIsOpen(false)
      onSuccess()
    } finally {
      setIsPending(false)
    }
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Archive item</DialogTitle>
            <DialogDescription>
              This will archive the item. (UI only for now.)
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton type="submit" loading={isPending}>
              Archive
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ArchiveItem

