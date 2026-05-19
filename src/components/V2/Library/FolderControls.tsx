import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Folder, FolderPlus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import {
  createV2DocumentFolder,
  type V2DocumentFolderPublic,
  type V2DocumentVisibility,
} from "@/api/v2Documents"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"

export function FolderCreateDialog({
  open,
  onOpenChange,
  demo,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  demo: boolean
  onCreated?: (folder: V2DocumentFolderPublic) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [name, setName] = useState("")
  const [visibility, setVisibility] = useState<V2DocumentVisibility>("private")

  const createMutation = useMutation({
    mutationFn: () =>
      createV2DocumentFolder({
        name: name.trim(),
        visibility,
      }),
    onSuccess: (folder) => {
      setName("")
      setVisibility("private")
      queryClient.invalidateQueries({
        queryKey: ["v2-document-folders", { demo }],
      })
      onCreated?.(folder)
      onOpenChange(false)
      showSuccessToast("Folder created.")
    },
    onError: () => {
      showErrorToast("Could not create folder.")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>
            Choose where this folder is visible in the library.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim() || demo) return
            createMutation.mutate()
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="folder-name">
              Folder name
            </label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Folder name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="folder-access">
              Access
            </label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as V2DocumentVisibility)
              }
            >
              <SelectTrigger id="folder-access" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={createMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || demo || createMutation.isPending}
            >
              <FolderPlus className="size-4" />
              {createMutation.isPending ? "Creating" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FolderPickerDropdown({
  folders,
  currentFolderId,
  disabled,
  onSelect,
  onCreateFolder,
  align = "start",
  triggerLabel,
}: {
  folders: V2DocumentFolderPublic[]
  currentFolderId: string | null
  disabled?: boolean
  onSelect: (folderId: string | null) => void
  onCreateFolder: () => void
  align?: "start" | "center" | "end"
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedFolder = folders.find((folder) => folder.id === currentFolderId)
  const filteredFolders = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return folders
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(needle),
    )
  }, [folders, query])

  const selectFolder = (folderId: string | null) => {
    onSelect(folderId)
    setOpen(false)
    setQuery("")
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="max-w-full justify-start"
        >
          <Folder className="size-4" />
          <span className="truncate">
            {triggerLabel ?? selectedFolder?.name ?? "Unfiled"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search folders"
            className="h-8 pl-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              selectFolder(null)
            }}
            className="gap-2"
          >
            <Folder className="size-4" />
            <span className="min-w-0 flex-1 truncate">Unfiled</span>
            {currentFolderId === null && <Check className="size-4" />}
          </DropdownMenuItem>
          {filteredFolders.map((folder) => (
            <DropdownMenuItem
              key={folder.id}
              onSelect={(event) => {
                event.preventDefault()
                selectFolder(folder.id)
              }}
              className="gap-2"
            >
              <Folder className="size-4" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              {folder.visibility === "organization" && (
                <Building2 className="size-3.5 text-muted-foreground" />
              )}
              {folder.id === currentFolderId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          {filteredFolders.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No folders found.
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start")}
          onClick={() => {
            setOpen(false)
            setQuery("")
            onCreateFolder()
          }}
        >
          <FolderPlus className="size-4" />
          Create folder
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
