import { useMutation, useQueryClient } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"
import { useState } from "react"

import { type ByokProvider, createByokCredential } from "@/api/v2Search"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ByokSetup({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState<ByokProvider>("openai")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createByokCredential({ provider, api_key: apiKey }),
    onSuccess: () => {
      setApiKey("")
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["v2-search-eligibility"] })
      onSaved()
    },
    onError: (err) => {
      setError((err as Error).message || "Could not save the key.")
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="size-5" /> Add an API key to unlock Search
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Pro plans run Search through your own Anthropic or OpenAI key. We
          encrypt the key at rest and never write it to logs. Switch to{" "}
          <strong>Max</strong> to skip BYOK and have Taskforce cover the LLM
          cost instead.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              Provider
            </div>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as ByokProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label
              htmlFor="taskforce-byok-api-key"
              className="mb-1 block text-xs uppercase text-muted-foreground"
            >
              API key
            </label>
            <Input
              id="taskforce-byok-api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder={provider === "openai" ? "sk-…" : "sk-ant-…"}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!apiKey.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
