import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  LaptopMinimal,
  RotateCw,
  Shield,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  type AgentCredentialPublic,
  createAgentCredential,
  readAgentCredentials,
  revokeAgentCredential,
  rotateAgentCredential,
} from "@/api/agentCredentials"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Label } from "../ui/label"

const DEFAULT_HOSTED_MCP_URL =
  import.meta.env.VITE_HOSTED_MCP_URL || "https://enderai-mcp.onrender.com/mcp"

type ClientKind = "codex" | "generic"

interface RevealedCredential {
  credentialId: string
  mcpToken: string
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function buildEnvSnippet(mcpToken: string): string {
  return `export ENDERAI_MCP_TOKEN="${mcpToken}"`
}

function buildCodexPersistentShellSnippet(mcpToken: string): string {
  const lines = [
    `printf '%s\n' '${mcpToken}' > ~/.enderai_mcp_token`,
    "chmod 600 ~/.enderai_mcp_token",
    `echo 'export ENDERAI_MCP_TOKEN="$(tr -d "\\r\\n" < ~/.enderai_mcp_token)"' >> ~/.bashrc`,
    "source ~/.bashrc",
  ]

  return lines.join("\n")
}

function buildGenericTokenSnippet(mcpToken: string): string {
  return mcpToken
}

function buildGenericConfigSnippet(hostedMcpUrl: string): string {
  return JSON.stringify(
    {
      inputs: [
        {
          type: "promptString",
          id: "enderai_mcp_token",
          description: "EnderAI MCP token",
          password: true,
        },
      ],
      servers: {
        "enderai-api": {
          type: "http",
          url: hostedMcpUrl,
          headers: {
            Authorization: `Bearer ${"$"}{input:enderai_mcp_token}`,
          },
        },
      },
    },
    null,
    2,
  )
}

function buildCodexConfigSnippet(hostedMcpUrl: string): string {
  return [
    "[mcp_servers.enderai-api]",
    `url = "${hostedMcpUrl}"`,
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  ].join("\n")
}

function buildAgentInstructionSnippet(): string {
  return [
    "If EnderAI tools are available:",
    "- Start meaningful user-initiated work with `enderai_begin_case`.",
    "- Let EnderAI auto-hydrate relevant prior context before work begins.",
    "- Use `enderai_update_case` as material progress develops.",
    "- Use `enderai_finish_case` when the work is complete.",
    "- Prefer the guided case tools over raw `enderai_request` calls.",
  ].join("\n")
}

function SnippetBlock({
  title,
  description,
  snippet,
  copiedText,
  onCopy,
  testId,
}: {
  title: string
  description: string
  snippet: string
  copiedText: string | null
  onCopy: (value: string) => void
  testId?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/20">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(snippet)}
        >
          <Copy className="size-4" />
          {copiedText === snippet ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className="overflow-x-auto px-4 py-3 text-xs leading-6"
        data-testid={testId}
      >
        <code>{snippet}</code>
      </pre>
    </div>
  )
}

function CredentialCard({
  credential,
  isSelected,
  hasRevealedToken,
  onSelect,
  onRotate,
  onRevoke,
  rotating,
  revoking,
}: {
  credential: AgentCredentialPublic
  isSelected: boolean
  hasRevealedToken: boolean
  onSelect: () => void
  onRotate: () => void
  onRevoke: () => void
  rotating: boolean
  revoking: boolean
}) {
  const isRevoked = credential.revoked_at !== null

  return (
    <div
      className={cn(
        "w-full rounded-xl border px-4 py-4 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40",
        isRevoked && "cursor-not-allowed opacity-70",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{credential.label}</span>
            <Badge variant={isRevoked ? "destructive" : "secondary"}>
              {isRevoked ? "Revoked" : "Active"}
            </Badge>
            {hasRevealedToken ? (
              <Badge variant="success">Tokens ready</Badge>
            ) : null}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Last rotated: {formatTimestamp(credential.last_rotated_at)}</p>
            <p>Last used: {formatTimestamp(credential.last_used_at)}</p>
            <p>
              Current token expires:{" "}
              {formatTimestamp(credential.current_token_expires_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isSelected ? "secondary" : "outline"}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
            disabled={isRevoked}
          >
            {isSelected ? "Selected" : "Use this credential"}
          </Button>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            loading={rotating}
            onClick={(event) => {
              event.stopPropagation()
              onRotate()
            }}
            disabled={isRevoked}
          >
            <RotateCw className="size-4" />
            Rotate
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            loading={revoking}
            onClick={(event) => {
              event.stopPropagation()
              onRevoke()
            }}
            disabled={isRevoked}
          >
            <Trash2 className="size-4" />
            Revoke
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}

const ConnectAgent = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [copiedText, copy] = useCopyToClipboard()
  const [selectedClient, setSelectedClient] = useState<ClientKind>("generic")
  const [credentialLabel, setCredentialLabel] = useState(
    "Codex CLI (terminal)",
  )
  const [hostedMcpUrl, setHostedMcpUrl] = useState(DEFAULT_HOSTED_MCP_URL)
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    string | null
  >(null)
  const [revealedCredential, setRevealedCredential] =
    useState<RevealedCredential | null>(null)

  const credentialsQuery = useQuery({
    queryKey: ["agentCredentials"],
    queryFn: readAgentCredentials,
  })

  const credentials = credentialsQuery.data?.data ?? []
  const selectedCredential =
    credentials.find((credential) => credential.id === selectedCredentialId) ??
    null

  useEffect(() => {
    if (!credentials.length) {
      setSelectedCredentialId(null)
      return
    }

    const activeCredential = credentials.find(
      (credential) =>
        credential.id === selectedCredentialId &&
        credential.revoked_at === null,
    )
    if (activeCredential) {
      return
    }

    const firstActiveCredential = credentials.find(
      (credential) => credential.revoked_at === null,
    )
    setSelectedCredentialId(
      firstActiveCredential?.id ?? credentials[0]?.id ?? null,
    )
  }, [credentials, selectedCredentialId])

  useEffect(() => {
    if (
      selectedClient === "codex" &&
      credentialLabel === "Generic MCP client"
    ) {
      setCredentialLabel("Codex CLI (terminal)")
    }
    if (
      selectedClient === "generic" &&
      credentialLabel === "Codex CLI (terminal)"
    ) {
      setCredentialLabel("Generic MCP client")
    }
  }, [credentialLabel, selectedClient])

  const createMutation = useMutation({
    mutationFn: (label: string) => createAgentCredential({ label }),
    onSuccess: (result) => {
      showSuccessToast("Agent credential created")
      setSelectedCredentialId(result.credential.id)
      setRevealedCredential({
        credentialId: result.credential.id,
        mcpToken: result.mcp_access_token,
      })
      queryClient.invalidateQueries({ queryKey: ["agentCredentials"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const rotateMutation = useMutation({
    mutationFn: (credentialId: string) => rotateAgentCredential(credentialId),
    onSuccess: (result) => {
      showSuccessToast("Agent credential rotated")
      setSelectedCredentialId(result.credential.id)
      setRevealedCredential({
        credentialId: result.credential.id,
        mcpToken: result.mcp_access_token,
      })
      queryClient.invalidateQueries({ queryKey: ["agentCredentials"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const revokeMutation = useMutation({
    mutationFn: (credentialId: string) => revokeAgentCredential(credentialId),
    onSuccess: (_, credentialId) => {
      showSuccessToast("Agent credential revoked")
      setRevealedCredential((current) =>
        current?.credentialId === credentialId ? null : current,
      )
      queryClient.invalidateQueries({ queryKey: ["agentCredentials"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const trimmedLabel = credentialLabel.trim()
  const nextLabel =
    trimmedLabel ||
    (selectedClient === "codex"
      ? "Codex CLI (terminal)"
      : "Generic MCP client")

  const mcpToken =
    revealedCredential?.credentialId === selectedCredentialId
      ? revealedCredential.mcpToken
      : null
  const hasTokensForSelectedFlow = mcpToken !== null
  const envSnippet =
    hasTokensForSelectedFlow
      ? selectedClient === "codex"
        ? buildEnvSnippet(mcpToken ?? "")
        : buildGenericTokenSnippet(mcpToken ?? "")
      : null
  const clientSnippet = hasTokensForSelectedFlow
    ? selectedClient === "codex"
      ? buildCodexConfigSnippet(hostedMcpUrl.trim())
      : buildGenericConfigSnippet(hostedMcpUrl.trim())
    : null
  const agentInstructionSnippet = buildAgentInstructionSnippet()
  const codexPersistentShellSnippet =
    hasTokensForSelectedFlow && selectedClient === "codex"
      ? buildCodexPersistentShellSnippet(mcpToken ?? "")
      : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LaptopMinimal className="size-5" />
            Connect Agent
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a per-user MCP token, client-specific setup, and the
            minimal EnderAI workflow snippet your agent needs.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {credentialsQuery.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Couldn&apos;t load agent credentials</AlertTitle>
              <AlertDescription>
                The frontend is up, but the backend credential endpoints
                weren&apos;t reachable. Make sure the `KAN-5` backend deploy is
                live, then refresh this page.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4 rounded-xl border p-4">
              <div className="space-y-2">
                <Label htmlFor="hosted-mcp-url">Hosted MCP URL</Label>
                <Input
                  id="hosted-mcp-url"
                  value={hostedMcpUrl}
                  onChange={(event) => setHostedMcpUrl(event.target.value)}
                  placeholder="https://enderai-mcp.onrender.com/mcp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credential-label">Credential label</Label>
                <Input
                  id="credential-label"
                  data-testid="agent-credential-label"
                  value={credentialLabel}
                  onChange={(event) => setCredentialLabel(event.target.value)}
                  placeholder="Codex CLI (terminal)"
                />
              </div>

              <Alert>
                <Shield className="size-4" />
                <AlertTitle>Single-token hosted MCP flow</AlertTitle>
                <AlertDescription>
                  Use one user-scoped MCP token. The hosted MCP validates that
                  token and reuses it for backend API calls on your behalf.
                </AlertDescription>
              </Alert>

              <LoadingButton
                type="button"
                onClick={() => createMutation.mutate(nextLabel)}
                loading={createMutation.isPending}
                data-testid="create-agent-credential"
              >
                <KeyRound className="size-4" />
                Create credential
              </LoadingButton>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="font-medium">What this page gives you</h3>
              <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  One user-scoped MCP token for the hosted EnderAI flow.
                </li>
                <li className="flex gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
                  Copy/paste setup for terminal Codex CLI or a generic MCP
                  client. Pick one path, not both.
                </li>
                <li className="flex gap-2">
                  <RotateCw className="mt-0.5 size-4 shrink-0 text-primary" />A
                  visible rotate/revoke path later without reusing your normal
                  login token.
                </li>
                <li className="flex gap-2">
                  <LaptopMinimal className="mt-0.5 size-4 shrink-0 text-primary" />
                  A minimal workflow reminder so your agent starts meaningful
                  work by auto-hydrating context with EnderAI first.
                </li>
              </ul>
            </div>
          </div>

          <Tabs
            value={selectedClient}
            onValueChange={(value) => setSelectedClient(value as ClientKind)}
          >
            <TabsList>
              <TabsTrigger value="generic">Generic MCP client</TabsTrigger>
              <TabsTrigger value="codex">Codex CLI</TabsTrigger>
            </TabsList>
            <TabsContent value="generic" className="mt-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Where this goes</AlertTitle>
                <AlertDescription>
                  Use the JSON block below for a generic hosted MCP client.
                  Paste it into your local MCP config, reconnect the client, and
                  enter the prompted MCP token when asked. Do not also add the
                  Codex config. The hosted MCP service is already running.
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="codex" className="mt-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Where this goes</AlertTitle>
                <AlertDescription>
                  Use the TOML block below for terminal `codex`. Run the MCP
                  token export in the same shell before launching `codex`, then
                  add the MCP entry to `~/.codex/config.toml`. If you want new
                  terminals to pick up the token automatically, use the
                  persistent shell setup below instead of re-running `export`
                  each time.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {envSnippet && clientSnippet ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Fresh tokens ready</AlertTitle>
                <AlertDescription>
                  This token is only shown right now. If you lose it, rotate the
                  credential below to mint a fresh MCP token and regenerate the
                  setup snippets.
                </AlertDescription>
              </Alert>

              <SnippetBlock
                title={
                  selectedClient === "codex"
                    ? "Export this env var"
                    : "Token value to enter"
                }
                description={
                  selectedClient === "codex"
                    ? "Run these in the same shell that will launch `codex`."
                    : "Paste these values when your MCP client prompts for them. You do not need to export env vars for the generic hosted flow."
                }
                snippet={envSnippet}
                copiedText={copiedText}
                onCopy={(value) => {
                  void copy(value)
                }}
                testId="connect-agent-token"
              />

              <SnippetBlock
                title={
                  selectedClient === "codex"
                    ? "Codex CLI config"
                    : "Generic MCP client config"
                }
                description={
                  selectedClient === "codex"
                    ? "Add this block to ~/.codex/config.toml, then launch `codex` from that same shell."
                    : "Paste this into your local MCP config file. This is an alternative to the Codex flow, not an additional step."
                }
                snippet={clientSnippet}
                copiedText={copiedText}
                onCopy={(value) => {
                  void copy(value)
                }}
                testId="connect-agent-config"
              />

              {codexPersistentShellSnippet ? (
                <SnippetBlock
                  title="Optional: persist the token across new terminals"
                  description="Stores the token in a local file with chmod 600 and loads it from ~/.bashrc so future shells can launch `codex` without re-running `export`."
                  snippet={codexPersistentShellSnippet}
                  copiedText={copiedText}
                  onCopy={(value) => {
                    void copy(value)
                  }}
                  testId="connect-agent-persistent-shell"
                />
              ) : null}

              {selectedClient === "codex" ? (
                <Alert>
                  <Shield className="size-4" />
                  <AlertTitle>Why use the file-based shell setup</AlertTitle>
                  <AlertDescription>
                    Directly writing `export ENDERAI_MCP_TOKEN="..."` into
                    `~/.bashrc` also works, but it leaves the raw token in a
                    config file that is easier to copy, sync, diff, or share by
                    accident. The file-based flow is mainly about reducing that
                    accidental disclosure risk.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : selectedCredential ? (
            <Alert>
              <RotateCw className="size-4" />
              <AlertTitle>Rotate to reveal fresh tokens</AlertTitle>
              <AlertDescription>
                You have a credential selected, but its token is not shown again
                after creation. Rotate it below to mint a new MCP token and
                regenerate the setup snippets.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Create your first agent credential</AlertTitle>
              <AlertDescription>
                Once you create a credential, this page will generate the token,
                config, and workflow snippet for your chosen client.
              </AlertDescription>
            </Alert>
          )}

          <SnippetBlock
            title="Minimal agent instruction"
            description="Add this to your client or repo instructions so meaningful work starts by auto-hydrating EnderAI context first."
            snippet={agentInstructionSnippet}
            copiedText={copiedText}
            onCopy={(value) => {
              void copy(value)
            }}
            testId="connect-agent-instructions"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issued agent credentials</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rotate a credential to mint a fresh MCP token or revoke it when an
            install should stop working.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentialsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading credentials…
            </p>
          ) : credentials.length ? (
            credentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                isSelected={credential.id === selectedCredentialId}
                hasRevealedToken={
                  credential.id === revealedCredential?.credentialId
                }
                onSelect={() => setSelectedCredentialId(credential.id)}
                onRotate={() => rotateMutation.mutate(credential.id)}
                onRevoke={() => revokeMutation.mutate(credential.id)}
                rotating={
                  rotateMutation.isPending &&
                  rotateMutation.variables === credential.id
                }
                revoking={
                  revokeMutation.isPending &&
                  revokeMutation.variables === credential.id
                }
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No agent credentials yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectAgent
