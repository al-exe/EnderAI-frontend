import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  readSearchEligibility,
  type SearchEligibilityPublic,
} from "@/api/v2Search"
import type { UserPublic } from "@/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type SearchCitationEvent,
  type SearchEvent,
  streamSearch,
} from "@/lib/searchStream"

import { ByokSetup } from "./ByokSetup"
import { ChatComposer } from "./ChatComposer"
import { type Message, MessageList } from "./MessageList"
import { SearchUpsell } from "./SearchUpsell"

interface SearchPageProps {
  currentUser: UserPublic
}

export function SearchPage({ currentUser: _currentUser }: SearchPageProps) {
  const {
    data: eligibility,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["v2-search-eligibility"],
    queryFn: () => readSearchEligibility(),
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Stop any in-flight stream when the user navigates away.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleSend = useCallback(async (query: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: query,
      citations: [],
    }
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        text: "",
        citations: [],
      },
    ])
    setIsStreaming(true)

    try {
      const citations: SearchCitationEvent[] = []
      for await (const event of streamSearch({
        query,
        signal: controller.signal,
      })) {
        applyEvent(assistantId, event, setMessages, citations)
      }
    } catch (e) {
      if (controller.signal.aborted) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                text:
                  m.text +
                  (m.text ? "\n\n" : "") +
                  `(stream failed: ${(e as Error).message})`,
                error: true,
              }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Could not load Search eligibility. Try refreshing the page.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-6">
      <Header eligibility={eligibility} />
      <Gate
        eligibility={eligibility}
        onByokSaved={() => refetch()}
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
      />
    </div>
  )
}

function Header({ eligibility }: { eligibility: SearchEligibilityPublic }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="text-sm text-muted-foreground">
        Ask anything about the work you've captured in Taskforce — your
        documents are the source of truth.{" "}
        <RoutePill eligibility={eligibility} />
      </p>
    </div>
  )
}

function RoutePill({ eligibility }: { eligibility: SearchEligibilityPublic }) {
  if (!eligibility.allowed || !eligibility.route) return null
  if (eligibility.route === "managed") return null
  const label =
    eligibility.route === "byok:anthropic"
      ? "Using your Anthropic key"
      : "Using your OpenAI key"
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
      {label}
    </span>
  )
}

function Gate({
  eligibility,
  onByokSaved,
  messages,
  isStreaming,
  onSend,
}: {
  eligibility: SearchEligibilityPublic
  onByokSaved: () => void
  messages: Message[]
  isStreaming: boolean
  onSend: (query: string) => void
}) {
  if (eligibility.reason === "upgrade_required") {
    return <SearchUpsell />
  }
  if (eligibility.reason === "byok_required") {
    return <ByokSetup onSaved={onByokSaved} />
  }
  return (
    <>
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatComposer disabled={isStreaming} onSend={onSend} />
    </>
  )
}

function applyEvent(
  assistantId: string,
  event: SearchEvent,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  citations: SearchCitationEvent[],
): void {
  if (event.kind === "token") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, text: m.text + event.text } : m,
      ),
    )
  } else if (event.kind === "citation") {
    citations.push(event)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, citations: [...citations] } : m,
      ),
    )
  } else if (event.kind === "done") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              billed_to: event.billed_to,
              model_id: event.model_id,
              tokens_consumed: event.tokens_consumed,
            }
          : m,
      ),
    )
  } else if (event.kind === "error") {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              text:
                m.text +
                (m.text ? "\n\n" : "") +
                `(${event.code}: ${event.message})`,
              error: true,
            }
          : m,
      ),
    )
  }
}
