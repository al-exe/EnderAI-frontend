import { BookOpenText, Bot, Boxes, FileText, ReceiptText } from "lucide-react"
import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

import styles from "./Landing.module.css"

export function FeatureSection() {
  return (
    <section className={styles.features}>
      <div className={styles.wrap}>
        <FeatureRow
          body="Track every agent in one live view. Organize sessions into groups and enable them to contribute to a shared context window for compounding effectiveness."
          icon={Boxes}
          id="sessions"
          label="Sessions"
          title="Fleet visibility"
          visual={<SessionsPanel />}
          visualLeft
        />
        <FeatureRow
          body="Give your agents persistent identities. With a role, domain expertise, instructions, and captured knowledge, your agents spawn in ready to work."
          icon={Bot}
          id="profiles"
          label="Profiles"
          title="Agent identities"
          visual={<ProfilePanel />}
        />
        <FeatureRow
          body="Documents that write and update themselves as your agents work. Decisions, gotchas, and every important detail get noted down and reused when your agents work with Taskforce."
          icon={BookOpenText}
          id="library"
          label="Library"
          title="Self-maintaining documents"
          visual={<LibraryPanel />}
          visualLeft
        />
        <FeatureRow
          body="Archive every agent conversation. Back up your future decisions with hard evidence directly from your work."
          icon={ReceiptText}
          id="ledger"
          label="Ledger"
          title="Audit trail"
          visual={<LedgerPanel />}
        />
      </div>
    </section>
  )
}

function FeatureRow({
  body,
  icon: Icon,
  id,
  label,
  title,
  visual,
  visualLeft = false,
}: {
  body: string
  icon: ComponentType<{ className?: string }>
  id: string
  label: string
  title: string
  visual: ReactNode
  visualLeft?: boolean
}) {
  return (
    <div
      className={cn(styles.featureRow, visualLeft && styles.visualLeft)}
      id={id}
    >
      <div className={styles.featureCopy}>
        <div className={styles.featureLabel}>
          <span className={styles.featureIcon}>
            <Icon />
          </span>
          <span>{label}</span>
        </div>
        <h2>{title}</h2>
        <p className={cn(id === "profiles" && styles.profileFeatureBody)}>
          {body}
        </p>
      </div>
      <div className={styles.visual}>{visual}</div>
    </div>
  )
}

function Panel({
  children,
  chip,
  label,
}: {
  children: ReactNode
  chip?: string
  label: string
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={cn(styles.statusDot, styles.purpleDot)} />
        {label}
        <span className={styles.spacer} />
        {chip && <span className={styles.chip}>{chip}</span>}
      </div>
      {children}
    </div>
  )
}

function SessionsPanel() {
  return (
    <Panel chip="4 active" label="Sessions">
      <div className={styles.fleetBody}>
        <FleetGroup
          agents={[
            {
              name: "tax-refactor",
              task: "Applying automatic_tax to annual plan",
              tool: "Claude Code",
              host: "vm-04",
            },
            {
              name: "checkout-e2e",
              task: "Running Playwright suite - 14/20",
              tool: "Codex",
              host: "term-2",
            },
          ]}
          title="Checkout squad"
        />
        <FleetGroup
          agents={[
            {
              accent: "amber",
              name: "migrate-pg16",
              task: "Awaiting review on schema diff",
              tool: "Cursor",
              host: "vm-01",
            },
            {
              name: "api-deprecation",
              task: "Sweeping v1 callsites - 38 left",
              tool: "Claude Code",
              host: "vm-02",
            },
          ]}
          title="Platform"
        />
      </div>
    </Panel>
  )
}

function FleetGroup({
  agents,
  title,
}: {
  agents: Array<{
    accent?: "amber" | "green"
    host: string
    name: string
    task: string
    tool: string
  }>
  title: string
}) {
  return (
    <div className={styles.fleetGroup}>
      <div className={styles.groupHead}>
        {title} <span>{agents.length}</span>
        <b />
      </div>
      <div className={styles.agentCards}>
        {agents.map((agent) => (
          <div className={styles.agentCard} key={agent.name}>
            <div className={styles.agentTop}>
              <span>{agent.name}</span>
            </div>
            <div className={styles.agentTask}>
              <span
                className={cn(
                  styles.actionStatus,
                  agent.accent === "amber" ? styles.amberDot : styles.greenDot,
                )}
              />
              <span className={styles.agentTaskText}>{agent.task}</span>
            </div>
            <div className={styles.agentMeta}>
              <span>{agent.tool}</span>
              <span>{agent.host}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfilePanel() {
  return (
    <Panel chip="active" label="Profile">
      <div className={styles.profileBody}>
        <div className={styles.profileHead}>
          <div>
            <div className={styles.profileName}>Payments Specialist</div>
            <div className={styles.profileRole}>role - billing & checkout</div>
          </div>
        </div>
        <div className={styles.tags}>
          <span className={styles.accentTag}>Stripe</span>
          <span>tax & VAT</span>
          <span>subscriptions</span>
          <span>webhooks</span>
        </div>
        <div className={styles.statTiles}>
          <StatTile label="Sessions" value="142" valueNote="up" />
          <StatTile label="Docs linked" value="38" />
          <StatTile label="Route match" value="96%" />
        </div>
        <div className={styles.profileFoot}>
          <span>routed here</span> when prompts touch billing or tax logic
        </div>
      </div>
    </Panel>
  )
}

function StatTile({
  label,
  value,
  valueNote,
}: {
  label: string
  value: string
  valueNote?: string
}) {
  return (
    <div className={styles.statTile}>
      <div>
        {value}
        {valueNote && <small> {valueNote}</small>}
      </div>
      <span>{label}</span>
    </div>
  )
}

function LibraryPanel() {
  return (
    <Panel label="Library">
      <div className={styles.libraryBody}>
        <DocumentRow
          path="/billing/checkout.md"
          signal="updating now"
          title="Stripe checkout wiring"
          updating
        />
        <DocumentRow
          path="/billing/tax-rates.md"
          reused="Reused 4x"
          signal="Updated today"
          title="Tax-rates rollout"
        />
        <DocumentRow
          path="/platform/webhooks.md"
          reused="Reused 11x"
          signal="Updated 2d ago"
          title="Webhook retry semantics"
        />
        <DocumentRow
          path="/platform/migrate-pg16.md"
          reused="Reused 2x"
          signal="Updated 5d ago"
          title="PG16 migration notes"
        />
        <DocumentRow
          path="/agents/profile-routing.md"
          reused="Reused 7x"
          signal="Updated 1w ago"
          title="Profile routing rules"
        />
      </div>
    </Panel>
  )
}

function DocumentRow({
  path,
  reused,
  signal,
  title,
  updating = false,
}: {
  path: string
  reused?: string
  signal: string
  title: string
  updating?: boolean
}) {
  return (
    <div className={cn(styles.docRow, updating && styles.docUpdating)}>
      <span className={styles.docIcon}>
        <FileText />
      </span>
      <div>
        <div className={styles.docTitle}>{title}</div>
        <div className={styles.docPath}>{path}</div>
      </div>
      <div className={styles.docSignal}>
        {updating ? (
          <span className={styles.updateBadge}>
            <span />
            {signal}
          </span>
        ) : (
          <>
            {signal}
            {reused && (
              <>
                <br />
                <span>{reused}</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LedgerPanel() {
  return (
    <Panel chip="12,408 sessions" label="Ledger">
      <div className={styles.ledgerSearch}>
        <span>Stripe checkout wiring</span>
      </div>
      <table className={styles.ledgerTable}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Session</th>
            <th className={styles.hideSm}>Harness - agent</th>
            <th>Activity</th>
            <th className={styles.hideSm}>Referenced by</th>
          </tr>
        </thead>
        <tbody>
          <LedgerRow
            activity="Patched annual plan tax"
            doc="checkout.md"
            harness="cursor - tax-refactor"
            session="#a4f2"
            time="2:14 PM"
          />
          <LedgerRow
            activity="Ran 20 E2E specs"
            doc="tax-rates.md"
            harness="claude - checkout-e2e"
            session="#a4e9"
            time="1:47 PM"
          />
          <LedgerRow
            activity="Added EU no-VAT guard"
            doc="checkout.md"
            harness="codex - vat-fallback"
            muted
            session="#a4c1"
            time="11:02 AM"
          />
          <LedgerRow
            activity="Reviewed webhook retries"
            doc="webhooks.md"
            harness="cursor - billing-audit"
            muted
            session="#a4b7"
            time="9:30 AM"
          />
        </tbody>
      </table>
    </Panel>
  )
}

function LedgerRow({
  activity,
  doc,
  harness,
  muted = false,
  session,
  time,
}: {
  activity: string
  doc: string
  harness: string
  muted?: boolean
  session: string
  time: string
}) {
  return (
    <tr>
      <td className={styles.tableTime}>{time}</td>
      <td className={styles.tableSession}>{session}</td>
      <td className={cn(styles.tableHarness, styles.hideSm)}>
        <span
          className={cn(
            styles.statusDot,
            muted ? styles.grayDot : styles.greenDot,
          )}
        />
        {harness}
      </td>
      <td className={styles.tableActivity}>{activity}</td>
      <td className={cn(styles.tableRef, styles.hideSm)}>
        <a href="#library">{doc}</a>
      </td>
    </tr>
  )
}
