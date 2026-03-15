import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CopyPlus } from "lucide-react"

import type { ItemCreate, ItemPublic } from "@/client"
import { ItemsService } from "@/client"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface DuplicateItemProps {
  item: ItemPublic
  onSuccess: () => void
}

const DuplicateItem = ({ item, onSuccess }: DuplicateItemProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: ItemCreate) =>
      ItemsService.createItem({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(`Duplicated "${item.title}"`)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })

  const onDuplicate = () => {
    const payload: ItemCreate = {
      title: `${item.title} (copy)`,
      description: item.description ?? "",
    }
    mutation.mutate(payload)
  }

  return (
    <DropdownMenuItem
      disabled={mutation.isPending}
      onSelect={(e) => e.preventDefault()}
      onClick={onDuplicate}
    >
      <CopyPlus />
      Duplicate item
    </DropdownMenuItem>
  )
}

export default DuplicateItem
