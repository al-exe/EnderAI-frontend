import { Send } from "lucide-react"
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: (query: string) => void
}) {
  const [value, setValue] = useState("")

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
  }, [value, disabled, onSend])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-lg border border-border bg-card p-2"
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Taskforce…"
        rows={1}
        className="min-h-10 resize-none border-0 bg-transparent focus-visible:ring-0"
        disabled={disabled}
      />
      <Button type="submit" disabled={disabled || !value.trim()} size="icon">
        <Send className="size-4" />
      </Button>
    </form>
  )
}
