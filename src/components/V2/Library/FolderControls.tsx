import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  Check,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  createV2DocumentFolder,
  deleteV2DocumentFolder,
  updateV2DocumentFolder,
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

function getFolderDepths(
  folders: V2DocumentFolderPublic[],
): Map<string, number> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const depths = new Map<string, number>()

  const getDepth = (
    folder: V2DocumentFolderPublic,
    seen = new Set<string>(),
  ): number => {
    if (depths.has(folder.id)) return depths.get(folder.id) ?? 0
    if (!folder.parent_folder_id || seen.has(folder.id)) {
      depths.set(folder.id, 0)
      return 0
    }
    const parent = byId.get(folder.parent_folder_id)
    if (!parent) {
      depths.set(folder.id, 0)
      return 0
    }
    const nextSeen = new Set(seen).add(folder.id)
    const depth = getDepth(parent, nextSeen) + 1
    depths.set(folder.id, depth)
    return depth
  }

  for (const folder of folders) {
    getDepth(folder)
  }
  return depths
}

export function FolderCreateDialog({
  open,
  onOpenChange,
  demo,
  folders = [],
  initialParentFolderId = null,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  demo: boolean
  folders?: V2DocumentFolderPublic[]
  initialParentFolderId?: string | null
  onCreated?: (folder: V2DocumentFolderPublic) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [name, setName] = useState("")
  const [visibility, setVisibility] = useState<V2DocumentVisibility>("private")
  const [parentFolderId, setParentFolderId] = useState<string | null>(
    initialParentFolderId,
  )
  const folderDepths = useMemo(() => getFolderDepths(folders), [folders])

  const createMutation = useMutation({
    mutationFn: () =>
      createV2DocumentFolder(
        {
          name: name.trim(),
          visibility,
          parent_folder_id: parentFolderId,
        },
        { demo },
      ),
    onSuccess: (folder) => {
      setName("")
      setVisibility("private")
      setParentFolderId(initialParentFolderId)
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
            Choose where this folder lives and who can access it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim()) return
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
                {!demo && (
                  <SelectItem value="organization">Organization</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {folders.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="folder-parent">
                Parent folder
              </label>
              <Select
                value={parentFolderId ?? "root"}
                onValueChange={(value) =>
                  setParentFolderId(value === "root" ? null : value)
                }
              >
                <SelectTrigger id="folder-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Top level</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {"  ".repeat(folderDepths.get(folder.id) ?? 0)}
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
              disabled={!name.trim() || createMutation.isPending}
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

export function FolderActionsMenu({
  folder,
  folders = [],
  demo,
  onDeleted,
  align = "end",
}: {
  folder: V2DocumentFolderPublic
  folders?: V2DocumentFolderPublic[]
  demo: boolean
  onDeleted?: (folderId: string) => void
  align?: "start" | "center" | "end"
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [subfolderOpen, setSubfolderOpen] = useState(false)
  const [name, setName] = useState(folder.name)

  const invalidateLibraryQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["v2-document-folders", { demo }],
    })
    queryClient.invalidateQueries({
      queryKey: ["v2-documents", { demo }],
    })
  }

  const renameMutation = useMutation({
    mutationFn: () =>
      updateV2DocumentFolder(
        folder.id,
        {
          name: name.trim(),
        },
        { demo },
      ),
    onSuccess: () => {
      invalidateLibraryQueries()
      setRenameOpen(false)
      showSuccessToast("Folder renamed.")
    },
    onError: () => {
      showErrorToast("Could not rename folder.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteV2DocumentFolder(folder.id, { demo }),
    onSuccess: () => {
      invalidateLibraryQueries()
      setDeleteOpen(false)
      onDeleted?.(folder.id)
      showSuccessToast("Folder deleted.")
    },
    onError: () => {
      showErrorToast("Could not delete folder.")
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Open options for ${folder.name}`}
            className="cursor-pointer"
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => event.preventDefault()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-48">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(event) => {
              event.preventDefault()
              setSubfolderOpen(true)
            }}
          >
            <FolderPlus className="size-4" />
            Create sub-folder
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(event) => {
              event.preventDefault()
              setName(folder.name)
              setRenameOpen(true)
            }}
          >
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onSelect={(event) => {
              event.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FolderCreateDialog
        open={subfolderOpen}
        onOpenChange={setSubfolderOpen}
        demo={demo}
        folders={folders}
        initialParentFolderId={folder.id}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              Update the folder name shown in your library.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!name.trim()) return
              renameMutation.mutate()
            }}
          >
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`rename-folder-${folder.id}`}
              >
                Folder name
              </label>
              <Input
                id={`rename-folder-${folder.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={renameMutation.isPending}
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !name.trim() ||
                  name.trim() === folder.name ||
                  renameMutation.isPending
                }
              >
                {renameMutation.isPending ? "Renaming" : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription>
              This removes “{folder.name}” from the library. Documents in this
              folder will not be deleted; they will move to Unfiled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting" : "Delete folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  triggerClassName,
}: {
  folders: V2DocumentFolderPublic[]
  currentFolderId: string | null
  disabled?: boolean
  onSelect: (folderId: string | null) => void
  onCreateFolder: () => void
  align?: "start" | "center" | "end"
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedFolder = folders.find((folder) => folder.id === currentFolderId)
  const folderDepths = useMemo(() => getFolderDepths(folders), [folders])
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
          className={cn(
            "max-w-full cursor-pointer justify-start",
            triggerClassName,
          )}
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
            className="cursor-pointer gap-2"
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
              className="cursor-pointer gap-2"
            >
              <Folder className="size-4" />
              <span
                className="min-w-0 flex-1 truncate"
                style={{
                  paddingLeft: `${(folderDepths.get(folder.id) ?? 0) * 12}px`,
                }}
              >
                {folder.name}
              </span>
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
          className={cn("w-full cursor-pointer justify-start")}
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
