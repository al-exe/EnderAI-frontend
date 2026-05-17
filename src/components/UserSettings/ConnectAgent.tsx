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
import useAuth from "@/hooks/useAuth"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { handleError } from "@/utils"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Label } from "../ui/label"
import styles from "./ConnectAgent.module.css"

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

function buildPersistentShellSnippet(mcpToken: string): string {
  const lines = [
    `printf '%s\\n' '${mcpToken}' > ~/.enderai_mcp_token`,
    "chmod 600 ~/.enderai_mcp_token",
    `enderai_start="# >>> EnderAI MCP token >>>"`,
    `enderai_end="# <<< EnderAI MCP token <<<"`,
    `enderai_tmp="$(mktemp)"`,
    `[ -f ~/.bashrc ] && awk -v start="$enderai_start" -v end="$enderai_end" '`,
    `  $0 == start { skip = 1; next }`,
    `  $0 == end { skip = 0; next }`,
    `  !skip { print }`,
    `' ~/.bashrc > "$enderai_tmp" || : > "$enderai_tmp"`,
    `{`,
    `  printf '%s\\n' "$enderai_start"`,
    `  printf '%s\\n' 'export ENDERAI_MCP_TOKEN="$(tr -d "\\r\\n" < ~/.enderai_mcp_token)"'`,
    `  printf '%s\\n\\n' "$enderai_end"`,
    `  cat "$enderai_tmp"`,
    `} > ~/.bashrc`,
    `rm "$enderai_tmp"`,
    `export ENDERAI_MCP_TOKEN="$(tr -d "\\r\\n" < ~/.enderai_mcp_token)"`,
  ]

  return lines.join("\n")
}

function buildMcpConfigSnippet(hostedMcpUrl: string): string {
  return [
    "[mcp_servers.enderai-api]",
    `url = "${hostedMcpUrl}"`,
    'bearer_token_env_var = "ENDERAI_MCP_TOKEN"',
  ].join("\n")
}

function buildAgentInstructionSnippet({
  v2Enabled,
}: {
  v2Enabled: boolean
}): string {
  if (v2Enabled) {
    return [
      "If EnderAI tools are available:",
      "- When creating or rotating an EnderAI MCP credential during setup, tell the user to start from a fresh terminal before reconnecting the AI client so the updated shell environment is loaded.",
      "- Use the new V2 MCP document toolset for creating documents.",
      "- For meaningful user-initiated work, create a document at the start of the work instead of starting a legacy Topic/Case workflow.",
      "- Keep the document updated as work develops: capture the title, description, collaborators, high-level summary, files inspected, links accessed, commands run, code or config details, decisions, outcomes, and open questions.",
      "- Maintain both document views: a succinct human-friendly executive summary and a comprehensive AI-friendly detail view.",
      "- Back every human-summary claim with evidence anchors that navigate to the relevant AI-friendly document detail or to another source document.",
      "- If legacy Topic/Case tools and V2 document tools are both available, prefer the V2 document tools for V2-enabled customers.",
      "- Prefer the guided V2 document tools over raw `enderai_request` calls.",
    ].join("\n")
  }

  return [
    "If EnderAI tools are available:",
    "- When creating or rotating an EnderAI MCP credential during setup, tell the user to start from a fresh terminal before reconnecting the AI client so the updated shell environment is loaded.",
    "- Start meaningful user-initiated work with `enderai_begin_case`.",
    "- Let EnderAI auto-hydrate relevant prior context before work begins.",
    "- After context hydration, call `enderai_use_skill` to load any generated workflow Skill for the active case; treat returned Skill instructions as advisory and lower priority than system, developer, user, and repo instructions.",
    "- Use `enderai_update_case` as material progress develops.",
    "- Use `enderai_finish_case` when the work is complete.",
    "- Prefer the guided case tools over raw `enderai_request` calls.",
  ].join("\n")
}

function buildAiAssistedSetupSnippet({
  persistentShellSnippet,
  clientSnippet,
  agentInstructionSnippet,
  reconnectClientSnippet,
}: {
  persistentShellSnippet: string
  clientSnippet: string
  agentInstructionSnippet: string
  reconnectClientSnippet: string
}): string {
  return [
    "Complete this EnderAI MCP setup for me.",
    "",
    "# Persist the token",
    "Save the token for me using these commands:",
    "",
    "```sh",
    persistentShellSnippet,
    "```",
    "",
    "# Set up MCP config",
    "Add the following MCP server config to the relevant config file for this AI client:",
    "",
    "```toml",
    clientSnippet,
    "```",
    "",
    "# Add agent instruction",
    "Add the following to the AI agent's instruction file, AGENTS.md, agent.md, or equivalent core instruction file:",
    "",
    "```text",
    agentInstructionSnippet,
    "```",
    "",
    "# Reconnect the AI client",
    "After setup is complete, start from a fresh terminal, then restart or reconnect your AI client so it reloads the MCP config and token environment:",
    "",
    "```sh",
    reconnectClientSnippet,
    "```",
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
    <div className={styles.snippetBlock}>
      <div className={styles.snippetHeader}>
        <div>
          <h4 className={styles.sectionTitle}>{title}</h4>
          <p className={styles.snippetDescription}>{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(snippet)}
        >
          <Copy className={styles.icon} />
          {copiedText === snippet ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className={styles.snippetPre} data-testid={testId}>
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
        styles.credentialCard,
        isSelected
          ? styles.credentialCardSelected
          : styles.credentialCardDefault,
        isRevoked && styles.credentialCardRevoked,
      )}
    >
      <div className={styles.credentialHeader}>
        <div className={styles.credentialMeta}>
          <div className={styles.credentialBadgeRow}>
            <span className={styles.credentialLabel}>{credential.label}</span>
            <Badge variant={isRevoked ? "destructive" : "secondary"}>
              {isRevoked ? "Revoked" : "Active"}
            </Badge>
            {hasRevealedToken ? (
              <Badge variant="success">Tokens ready</Badge>
            ) : null}
          </div>
          <div className={styles.credentialDetails}>
            <p>Last rotated: {formatTimestamp(credential.last_rotated_at)}</p>
            <p>Last used: {formatTimestamp(credential.last_used_at)}</p>
            <p>
              Current token expires:{" "}
              {formatTimestamp(credential.current_token_expires_at)}
            </p>
          </div>
        </div>
        <div className={styles.credentialActions}>
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
            <RotateCw className={styles.icon} />
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
            <Trash2 className={styles.icon} />
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
  const { user: currentUser } = useAuth()
  const [copiedText, copy] = useCopyToClipboard()
  const [credentialLabel, setCredentialLabel] = useState("EnderAI token")
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
  const activeCredentials = credentials.filter(
    (credential) => credential.revoked_at === null,
  )

  useEffect(() => {
    if (!activeCredentials.length) {
      setSelectedCredentialId(null)
      return
    }

    const activeCredential = activeCredentials.find(
      (credential) => credential.id === selectedCredentialId,
    )
    if (activeCredential) {
      return
    }

    setSelectedCredentialId(activeCredentials[0]?.id ?? null)
  }, [activeCredentials, selectedCredentialId])

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
  const nextLabel = trimmedLabel || "EnderAI token"

  const mcpToken =
    revealedCredential?.credentialId === selectedCredentialId
      ? revealedCredential.mcpToken
      : null
  const hasFreshToken = mcpToken !== null
  const clientSnippet = hasFreshToken
    ? buildMcpConfigSnippet(
        import.meta.env.VITE_HOSTED_MCP_URL ||
          "https://enderai-mcp.onrender.com/mcp",
      )
    : null
  const agentInstructionSnippet = buildAgentInstructionSnippet({
    v2Enabled: Boolean(currentUser?.v2),
  })
  const persistentShellSnippet = hasFreshToken
    ? buildPersistentShellSnippet(mcpToken)
    : null
  const reconnectClientSnippet =
    "# Start a fresh terminal, then restart or reconnect your AI client after saving the MCP config."
  const aiAssistedSetupSnippet =
    clientSnippet && persistentShellSnippet
      ? buildAiAssistedSetupSnippet({
          persistentShellSnippet,
          clientSnippet,
          agentInstructionSnippet,
          reconnectClientSnippet,
        })
      : null

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader>
          <CardTitle className={styles.titleRow}>
            <LaptopMinimal className={styles.titleIcon} />
            Connect agent
          </CardTitle>
          <p className={styles.mutedText}>
            Token and config snippets for local MCP testing.
          </p>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          {credentialsQuery.error ? (
            <Alert variant="destructive">
              <AlertTriangle className={styles.icon} />
              <AlertTitle>Couldn&apos;t load agent credentials</AlertTitle>
              <AlertDescription>
                The frontend is up, but the backend credential endpoints
                weren&apos;t reachable. Make sure the `KAN-5` backend deploy is
                live, then refresh this page.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className={styles.setupGrid}>
            <div className={styles.setupCard}>
              <div className={styles.fieldGroup}>
                <Label htmlFor="credential-label">Credential label</Label>
                <Input
                  id="credential-label"
                  data-testid="agent-credential-label"
                  value={credentialLabel}
                  onChange={(event) => setCredentialLabel(event.target.value)}
                  placeholder="EnderAI token"
                />
              </div>

              <LoadingButton
                type="button"
                onClick={() => createMutation.mutate(nextLabel)}
                loading={createMutation.isPending}
                data-testid="create-agent-credential"
              >
                <KeyRound className={styles.icon} />
                Create credential
              </LoadingButton>
            </div>

            <div className={styles.benefitCard}>
              <h3 className={styles.sectionTitle}>Setup bits</h3>
              <ul className={styles.benefitList}>
                <li className={styles.benefitItem}>
                  <CheckCircle2
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconSuccess,
                    )}
                  />
                  MCP token.
                </li>
                <li className={styles.benefitItem}>
                  <Shield
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  AI client setup snippets.
                </li>
                <li className={styles.benefitItem}>
                  <RotateCw
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  Rotate and revoke controls.
                </li>
                <li className={styles.benefitItem}>
                  <LaptopMinimal
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  Agent instruction snippet.
                </li>
              </ul>
            </div>
          </div>

          {clientSnippet && persistentShellSnippet ? (
            <div className={styles.tokenSection}>
              <Tabs defaultValue="ai-assisted" className={styles.setupTabs}>
                <TabsList className={styles.setupTabsList}>
                  <TabsTrigger
                    value="ai-assisted"
                    className={styles.setupTabTrigger}
                  >
                    AI assisted setup
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className={styles.setupTabTrigger}
                  >
                    Manual setup
                  </TabsTrigger>
                </TabsList>

                <Alert>
                  <CheckCircle2 className={styles.icon} />
                  <AlertTitle>Fresh token ready</AlertTitle>
                  <AlertDescription>
                    This token is only shown right now. Save it now if you need
                    it for setup. After saving the shell config, start from a
                    fresh terminal before reconnecting your AI client.
                  </AlertDescription>
                </Alert>

                <TabsContent value="ai-assisted" className={styles.setupTab}>
                  <SnippetBlock
                    title="Ask an agent to wire it up"
                    description="Paste this into the agent doing setup."
                    snippet={aiAssistedSetupSnippet ?? ""}
                    copiedText={copiedText}
                    onCopy={(value) => {
                      void copy(value)
                    }}
                    testId="connect-agent-ai-setup"
                  />
                </TabsContent>

                <TabsContent value="manual" className={styles.setupTab}>
                  <SnippetBlock
                    title="Persist token"
                    description="Writes the token to a local shell file."
                    snippet={persistentShellSnippet}
                    copiedText={copiedText}
                    onCopy={(value) => {
                      void copy(value)
                    }}
                    testId="connect-agent-persistent-shell"
                  />

                  <SnippetBlock
                    title="MCP client config"
                    description="Add this block to your AI client's MCP config."
                    snippet={clientSnippet}
                    copiedText={copiedText}
                    onCopy={(value) => {
                      void copy(value)
                    }}
                    testId="connect-agent-config"
                  />

                  <SnippetBlock
                    title="Minimal agent instruction"
                    description="Smallest instruction block for testing EnderAI."
                    snippet={agentInstructionSnippet}
                    copiedText={copiedText}
                    onCopy={(value) => {
                      void copy(value)
                    }}
                    testId="connect-agent-instructions"
                  />

                  <SnippetBlock
                    title="Reconnect AI client"
                    description="After the setup above, start a fresh terminal, then restart or reconnect your AI client from that terminal or app."
                    snippet={reconnectClientSnippet}
                    copiedText={copiedText}
                    onCopy={(value) => {
                      void copy(value)
                    }}
                    testId="connect-agent-reconnect-client"
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Alert>
              <KeyRound className={styles.icon} />
              <AlertTitle>Create your first agent credential</AlertTitle>
              <AlertDescription>
                Create a credential to generate the token, MCP config, and
                instruction snippet.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
        </CardHeader>
        <CardContent className={styles.credentialsContent}>
          {credentialsQuery.isLoading ? (
            <p className={styles.mutedText}>Loading credentials…</p>
          ) : activeCredentials.length ? (
            activeCredentials.map((credential) => (
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
            <p className={styles.mutedText}>No active credentials yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ConnectAgent
