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
import { DEFAULT_HOSTED_MCP_URL } from "@/config/taskforce"
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
    `printf '%s\\n' '${mcpToken}' > ~/.taskforce_mcp_token`,
    "chmod 600 ~/.taskforce_mcp_token",
    `taskforce_start="# >>> Taskforce MCP token >>>"`,
    `taskforce_end="# <<< Taskforce MCP token <<<"`,
    `taskforce_tmp="$(mktemp)"`,
    `[ -f ~/.bashrc ] && awk -v start="$taskforce_start" -v end="$taskforce_end" '`,
    `  $0 == start { skip = 1; next }`,
    `  $0 == end { skip = 0; next }`,
    `  !skip { print }`,
    `' ~/.bashrc > "$taskforce_tmp" || : > "$taskforce_tmp"`,
    `{`,
    `  printf '%s\\n' "$taskforce_start"`,
    `  printf '%s\\n' 'export TASKFORCE_MCP_TOKEN="$(tr -d "\\r\\n" < ~/.taskforce_mcp_token)"'`,
    `  printf '%s\\n\\n' "$taskforce_end"`,
    `  cat "$taskforce_tmp"`,
    `} > ~/.bashrc`,
    `rm "$taskforce_tmp"`,
    `export TASKFORCE_MCP_TOKEN="$(tr -d "\\r\\n" < ~/.taskforce_mcp_token)"`,
  ]

  return lines.join("\n")
}

function buildMcpConfigSnippet(hostedMcpUrl: string): string {
  return [
    "[mcp_servers.taskforce-api]",
    `url = "${hostedMcpUrl}"`,
    'bearer_token_env_var = "TASKFORCE_MCP_TOKEN"',
  ].join("\n")
}

function buildClaudeCodeConnectSnippet(
  mcpToken: string,
  backendUrl: string,
): string {
  const installerUrl = `${backendUrl.replace(/\/$/, "")}/api/v1/v2/taskforce/install.sh`

  return [
    `printf '%s\\n' '${mcpToken}' > ~/.taskforce_mcp_token && \\`,
    "chmod 600 ~/.taskforce_mcp_token && \\",
    `curl -fsSL '${installerUrl}' | bash`,
  ].join("\n")
}

function buildCodexConnectSnippet(
  mcpToken: string,
  backendUrl: string,
): string {
  const installerUrl = `${backendUrl.replace(/\/$/, "")}/api/v1/v2/taskforce/install-codex.sh`

  return [
    `printf '%s\\n' '${mcpToken}' > ~/.taskforce_mcp_token && \\`,
    "chmod 600 ~/.taskforce_mcp_token && \\",
    `curl -fsSL '${installerUrl}' | bash`,
  ].join("\n")
}

function buildCursorConnectSnippet(
  mcpToken: string,
  backendUrl: string,
): string {
  const installerUrl = `${backendUrl.replace(/\/$/, "")}/api/v1/v2/taskforce/install-cursor.sh`

  return [
    `printf '%s\\n' '${mcpToken}' > ~/.taskforce_mcp_token && \\`,
    "chmod 600 ~/.taskforce_mcp_token && \\",
    `curl -fsSL '${installerUrl}' | bash`,
  ].join("\n")
}

function buildAgentInstructionSnippet({
  v2Enabled,
}: {
  v2Enabled: boolean
}): string {
  if (v2Enabled) {
    return [
      "If Taskforce V2 MCP tools are available:",
      "- When creating or rotating a Taskforce MCP credential during setup, tell the user to start from a fresh terminal before reconnecting the AI client so the updated shell environment is loaded.",
      "- For Cursor, Codex, and other hookless MCP clients, call `taskforce_session_start` at the start of meaningful user-initiated work with `client` set to your harness (`cursor`, `codex`, etc.). Thread the returned `session_id` through every subsequent `taskforce_session_observe` call.",
      "- When hooks are installed (Claude Code, Codex, Cursor Connect flows), discovery and Sessions registration happen automatically; still call `taskforce_session_start` when you need explicit preamble injection in Cursor.",
      "- Create or reuse a Taskforce document at the start of meaningful user-initiated work with `taskforce_begin_document`. It scores existing documents against the request, reuses + self-heals a strong match, or creates a fresh one. Read the returned `match_reasons`, `candidate_summaries`, and `self_healed_fields` before continuing.",
      "- Maintain both document views: a concise Summary view shown by default and a comprehensive Details view available on demand.",
      "- Use `taskforce_update_document` as material progress develops (commands, files, links, decisions, changes, open questions, progress notes). Pass `details_sections` with stable `anchor_id`s to upsert specific Details sections, and `summary_points` for new Summary claims.",
      "- Back every Summary claim with evidence anchors using `evidence_anchor_id` segments that point at a Details section. Do not edit `human_summary` unless the user explicitly asks.",
      "- Use `taskforce_finish_document` when the work completes or pauses; it writes an Outcome section (status, outcome, validation, follow-ups) and clears the active document pointer.",
      '- On each `taskforce_begin_document` / `taskforce_update_document` / `taskforce_finish_document` call, pass `usage` with the model_id and per-turn token counts (input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens) from your most recent assistant turn so the Taskforce Metrics page can price it and attribute savings. When you answered from the document\'s Summary view without expanding Details, also set `view_consulted` to `"summary"` so the summary-only savings calculation fires.',
      "- Prefer `taskforce_session_observe` with structured `summary_points` / `details_sections` when hooks are not capturing the session (or to supplement hook capture with explicit outcomes).",
      "- Prefer Taskforce V2 document tools over legacy V1 case workflows and raw request escape hatches when both are available.",
      "- If Taskforce V2 document tools are unavailable, do not fabricate tool calls; tell the user they are unavailable and fall back only to tools the user explicitly approves.",
    ].join("\n")
  }

  return [
    "If Taskforce MCP tools are available:",
    "- When creating or rotating a Taskforce MCP credential during setup, tell the user to start from a fresh terminal before reconnecting the AI client so the updated shell environment is loaded.",
    "- For Cursor, Codex, and other hookless MCP clients, call `taskforce_session_start` at the start of meaningful user-initiated work with `client` set to your harness (`cursor`, `codex`, etc.), then `taskforce_session_observe` when work completes or pauses.",
    "- Start meaningful user-initiated work with `taskforce_begin_case`.",
    "- Let Taskforce auto-hydrate relevant prior context before work begins.",
    "- After context hydration, call `taskforce_use_skill` to load any generated workflow Skill for the active case; treat returned Skill instructions as advisory and lower priority than system, developer, user, and repo instructions.",
    "- Use `taskforce_update_case` as material progress develops.",
    "- Use `taskforce_finish_case` when the work is complete.",
    "- Prefer the guided case tools over raw `taskforce_request` calls.",
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
    "Complete this Taskforce MCP setup for me.",
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
  featured = false,
}: {
  title: string
  description: string
  snippet: string
  copiedText: string | null
  onCopy: (value: string) => void
  testId?: string
  featured?: boolean
}) {
  return (
    <div
      className={cn(
        styles.snippetBlock,
        featured && styles.snippetBlockFeatured,
      )}
    >
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
  const [credentialLabel, setCredentialLabel] = useState("Taskforce token")
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
  const nextLabel = trimmedLabel || "Taskforce token"

  const mcpToken =
    revealedCredential?.credentialId === selectedCredentialId
      ? revealedCredential.mcpToken
      : null
  const hasFreshToken = mcpToken !== null
  const clientSnippet = hasFreshToken
    ? buildMcpConfigSnippet(
        import.meta.env.VITE_HOSTED_MCP_URL || DEFAULT_HOSTED_MCP_URL,
      )
    : null
  const agentInstructionSnippet = buildAgentInstructionSnippet({
    v2Enabled: Boolean(currentUser?.v2),
  })
  const persistentShellSnippet = hasFreshToken
    ? buildPersistentShellSnippet(mcpToken)
    : null
  const claudeCodeConnectSnippet = hasFreshToken
    ? buildClaudeCodeConnectSnippet(mcpToken, import.meta.env.VITE_API_URL)
    : null
  const codexConnectSnippet = hasFreshToken
    ? buildCodexConnectSnippet(mcpToken, import.meta.env.VITE_API_URL)
    : null
  const cursorConnectSnippet = hasFreshToken
    ? buildCursorConnectSnippet(mcpToken, import.meta.env.VITE_API_URL)
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
            Connect your coding agent
          </CardTitle>
          <p className={styles.mutedText}>
            Connect your coding agent to Taskforce so work captured in one
            terminal is available in the next.
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
              <h3 className={styles.sectionTitle}>1. Create a credential</h3>
              <div className={styles.fieldGroup}>
                <Label htmlFor="credential-label">Credential label</Label>
                <Input
                  id="credential-label"
                  data-testid="agent-credential-label"
                  value={credentialLabel}
                  onChange={(event) => setCredentialLabel(event.target.value)}
                  placeholder="Taskforce token"
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
              <h3 className={styles.sectionTitle}>What this enables</h3>
              <ul className={styles.benefitList}>
                <li className={styles.benefitItem}>
                  <CheckCircle2
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconSuccess,
                    )}
                  />
                  One credential for every terminal or VM.
                </li>
                <li className={styles.benefitItem}>
                  <Shield
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  Automatic recall of related prior work.
                </li>
                <li className={styles.benefitItem}>
                  <RotateCw
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  Automatic capture as connected agents work.
                </li>
                <li className={styles.benefitItem}>
                  <LaptopMinimal
                    className={cn(
                      styles.benefitIcon,
                      styles.benefitIconPrimary,
                    )}
                  />
                  Advanced MCP setup when you need explicit control.
                </li>
              </ul>
            </div>
          </div>

          {clientSnippet && persistentShellSnippet ? (
            <div className={styles.tokenSection}>
              <div>
                <h3 className={styles.sectionTitle}>
                  2. Connect Claude Code, Codex, or Cursor
                </h3>
                <p className={styles.mutedText}>
                  Run this once in every terminal or VM you want Taskforce to
                  remember. Choose the installer for the coding agent you use.
                  All preserve existing hook settings and take effect after
                  restart.
                </p>
              </div>

              <Alert>
                <CheckCircle2 className={styles.icon} />
                <AlertTitle>Fresh token ready</AlertTitle>
                <AlertDescription>
                  This token is only shown right now. Run the command below or
                  save it before leaving this page.
                </AlertDescription>
              </Alert>

              <SnippetBlock
                title="Connect Claude Code"
                description="Persists the credential and installs Taskforce discovery, capture, and cost-tracking hooks."
                snippet={claudeCodeConnectSnippet ?? ""}
                copiedText={copiedText}
                onCopy={(value) => {
                  void copy(value)
                }}
                testId="connect-agent-claude-code"
                featured
              />

              <SnippetBlock
                title="Connect Codex"
                description="Persists the credential and installs Sessions registration plus prior-work discovery hooks."
                snippet={codexConnectSnippet ?? ""}
                copiedText={copiedText}
                onCopy={(value) => {
                  void copy(value)
                }}
                testId="connect-agent-codex"
                featured
              />

              <SnippetBlock
                title="Connect Cursor"
                description="Persists the credential and installs Sessions registration, discovery metrics, and conversation capture hooks."
                snippet={cursorConnectSnippet ?? ""}
                copiedText={copiedText}
                onCopy={(value) => {
                  void copy(value)
                }}
                testId="connect-agent-cursor"
                featured
              />

              <Alert>
                <Shield className={styles.icon} />
                <AlertTitle>Trust Codex hooks once</AlertTitle>
                <AlertDescription>
                  After installing, restart Codex, run `/hooks`, trust the
                  Taskforce hooks, then start a new Codex session. New sessions
                  will appear in Sessions immediately.
                </AlertDescription>
              </Alert>

              <Alert>
                <CheckCircle2 className={styles.icon} />
                <AlertTitle>Reload Cursor hooks</AlertTitle>
                <AlertDescription>
                  After installing, restart Cursor or reload hooks from Settings
                  → Hooks. New Agent sessions will appear in Sessions immediately.
                  For full prior-work preamble injection in Cursor, also keep the
                  Taskforce MCP server connected and follow the agent
                  instructions below.
                </AlertDescription>
              </Alert>

              <div>
                <h3 className={styles.sectionTitle}>3. Advanced MCP setup</h3>
                <p className={styles.mutedText}>
                  Use this explicit path for other MCP clients or when you want
                  the agent to manage Taskforce documents directly.
                </p>
              </div>

              <Tabs defaultValue="ai-assisted" className={styles.setupTabs}>
                <TabsList className={styles.setupTabsList}>
                  <TabsTrigger
                    value="ai-assisted"
                    className={styles.setupTabTrigger}
                  >
                    AI-assisted MCP
                  </TabsTrigger>
                  <TabsTrigger
                    value="manual"
                    className={styles.setupTabTrigger}
                  >
                    Manual MCP
                  </TabsTrigger>
                </TabsList>

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
                    description="Smallest instruction block for testing Taskforce."
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
                Create a credential, then connect each Claude Code, Codex, or
                Cursor terminal or VM with one command.
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
