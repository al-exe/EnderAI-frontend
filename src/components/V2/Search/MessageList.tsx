import { Sparkles, User2 } from "lucide-react"
import { useEffect, useRef } from "react"

import type { SearchCitationEvent } from "@/lib/searchStream"

import { CitationChip } from "./CitationChip"

export interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  citations: SearchCitationEvent[]
  billed_to?: "managed" | "byok:anthropic" | "byok:openai"
  model_id?: string
  tokens_consumed?: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_creation_tokens: number
  }
  error?: boolean
}

export function MessageList({
  messages,
  isStreaming,
}: {
  messages: Message[]
  isStreaming: boolean
}) {
  const endRef = useRef<HTMLDivElement | null>(null)
  const lastMessageText = messages[messages.length - 1]?.text ?? ""

  useEffect(() => {
    if (messages.length > 0 || isStreaming || lastMessageText) {
      endRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, isStreaming, lastMessageText])

  if (messages.length === 0) {
    return (
      <div
        aria-busy={isStreaming}
        className="flex flex-1 items-center justify-center text-sm text-muted-foreground"
      >
        Ask a question to get started — try{" "}
        <em className="mx-1">"what did we decide about the metrics page?"</em>
        or <em className="mx-1">"who looked at the auth flow last week?"</em>
      </div>
    )
  }

  return (
    <div
      aria-busy={isStreaming}
      className="flex flex-1 flex-col gap-6 overflow-y-auto pb-4"
    >
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  )
}

function MessageRow({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">
        {isUser ? (
          <User2 className="size-5" />
        ) : (
          <Sparkles className="size-5" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className={
            "whitespace-pre-wrap break-words text-sm" +
            (message.error ? " text-destructive" : "")
          }
        >
          {message.text || (isUser ? "" : "…")}
        </div>
        {message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationChip
                key={`${c.source_item_id}-${c.chunk_anchor_id}-${i}`}
                citation={c}
                index={i + 1}
              />
            ))}
          </div>
        )}
        {message.tokens_consumed && (
          <div className="text-xs text-muted-foreground">
            {message.billed_to === "managed" ? "Managed" : "BYOK"} ·{" "}
            {message.model_id} ·{" "}
            {message.tokens_consumed.input_tokens.toLocaleString()} in /{" "}
            {message.tokens_consumed.output_tokens.toLocaleString()} out
          </div>
        )}
      </div>
    </div>
  )
}
