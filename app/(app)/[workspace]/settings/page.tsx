import { deleteStage, revokeApiKey } from "@/app/actions";
import {
  getApiKeys,
  getImportRuns,
  getStageUsage,
  getStages,
} from "@/lib/queries";
import { requireWorkspace } from "@/lib/workspace";
import {
  EditStageDialog,
  EditWorkspaceDialog,
  ImportDialog,
  NewApiKeyDialog,
  NewStageDialog,
  NewWorkspaceDialog,
} from "@/components/dialogs";
import { StageReorder } from "@/components/settings/stage-reorder";
import { TrashIcon } from "@/components/icons";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDate, relativeTime } from "@/lib/format";
import { stageColor } from "@/lib/viz";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspace = await requireWorkspace(slug);

  const [stages, usage, keys, runs] = await Promise.all([
    getStages(workspace.id),
    getStageUsage(workspace.id),
    getApiKeys(workspace.id),
    getImportRuns(workspace.id),
  ]);

  const liveKeys = keys.filter((k) => !k.revoked_at);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={`Pipeline, imports and API access for ${workspace.name}.`}
        actions={<EditWorkspaceDialog workspace={workspace} />}
      />

      <div className="space-y-5 px-5 py-6 sm:px-8">
        {/* ------------------------------------------------------- stages */}
        <Section
          title="Pipeline stages"
          description="The columns on the board, in order. Colours are assigned automatically so the pipeline always reads dark to light."
          actions={<NewStageDialog workspaceId={workspace.id} />}
        >
          <ul className="divide-y divide-line-soft">
            {stages.map((stage, index) => {
              const inUse = usage.get(stage.id) ?? 0;
              return (
                <li
                  key={stage.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stageColor(stage) }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink">
                      {stage.name}
                      {stage.is_won && (
                        <span className="chip bg-positive/12 text-positive">
                          Wins the deal
                        </span>
                      )}
                    </p>
                    {stage.description && (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {stage.description}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-ink-faint">
                    {inUse} {inUse === 1 ? "deal" : "deals"}
                  </span>

                  <StageReorder
                    stageId={stage.id}
                    workspaceId={workspace.id}
                    canMoveUp={index > 0}
                    canMoveDown={index < stages.length - 1}
                  />

                  <EditStageDialog stage={stage} workspaceId={workspace.id} />

                  {/* Deleting a stage that holds deals would lose where those
                      deals had got to, so it is blocked rather than cascading. */}
                  <form action={deleteStage}>
                    <input type="hidden" name="id" value={stage.id} />
                    <input
                      type="hidden"
                      name="workspace_id"
                      value={workspace.id}
                    />
                    <button
                      type="submit"
                      disabled={inUse > 0 || stages.length <= 2}
                      title={
                        inUse > 0
                          ? "Move its deals elsewhere first"
                          : stages.length <= 2
                            ? "A pipeline needs at least two stages"
                            : "Delete stage"
                      }
                      className="p-1 text-ink-faint transition-colors hover:text-negative disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-ink-faint"
                      aria-label={`Delete ${stage.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ------------------------------------------------------- import */}
        <Section
          title="Import data"
          description="Bring in a list from a spreadsheet or another CRM."
          actions={
            <div className="flex gap-2">
              <ImportDialog workspaceId={workspace.id} entity="contacts" />
              <ImportDialog workspaceId={workspace.id} entity="companies" />
            </div>
          }
        >
          <div className="px-4 py-4">
            <p className="text-sm text-ink-muted">
              Imported people land in <strong className="text-ink">Contacts</strong>{" "}
              with a lifecycle of “New” — <em>not</em> on the deal board. A
              thousand cold contacts add a thousand rows to the contact list and
              nothing to the pipeline. A deal gets created when someone
              actually replies.
            </p>

            {runs.length > 0 && (
              <div className="mt-4 border-t border-line-soft pt-3">
                <p className="label-caps mb-2">Recent imports</p>
                <ul className="space-y-1.5">
                  {runs.map((run) => (
                    <li
                      key={run.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
                    >
                      <span className="text-ink">
                        {run.entity} · {run.source}
                        <span className="text-ink-faint">
                          {" "}
                          — {run.created} created, {run.updated} updated
                          {run.failed > 0 ? `, ${run.failed} skipped` : ""}
                        </span>
                      </span>
                      <span className="text-ink-faint">
                        {relativeTime(run.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* ---------------------------------------------------- api keys */}
        <Section
          title="API keys"
          description="For n8n, a sequencer webhook, or any script that needs to push data in."
          actions={<NewApiKeyDialog workspaceId={workspace.id} />}
        >
          {liveKeys.length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Create one to import contacts or create deals from outside the app."
              action={<NewApiKeyDialog workspaceId={workspace.id} />}
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {liveKeys.map((key) => (
                <li
                  key={key.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{key.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-faint">
                      {key.token_prefix}…
                    </p>
                  </div>
                  <span className="text-xs text-ink-faint">
                    {key.last_used_at
                      ? `Last used ${relativeTime(key.last_used_at)}`
                      : `Created ${formatDate(key.created_at)} · never used`}
                  </span>
                  <form action={revokeApiKey}>
                    <input type="hidden" name="id" value={key.id} />
                    <button type="submit" className="btn btn-danger">
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line-soft px-4 py-4">
            <p className="label-caps mb-2">Endpoints</p>
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-muted">
{`POST /api/v1/contacts    { "contacts": [ ... ] }   up to 1000 per call
POST /api/v1/companies   { "companies": [ ... ] }
POST /api/v1/deals       { "title": "...", "contact_email": "..." }
GET  /api/v1/contacts?lifecycle=replied&limit=100
GET  /api/v1/deals?status=open

Authorization: Bearer crm_live_…`}
            </pre>
            <p className="mt-2 text-xs text-ink-faint">
              Contacts are matched on email and companies on name, so re-sending
              the same payload updates rather than duplicates. Keys are scoped to{" "}
              {workspace.name} alone.
            </p>
          </div>
        </Section>

        {/* --------------------------------------------------- workspaces */}
        <Section
          title="Workspaces"
          description="Each one is a separate business with its own data."
          actions={
            <NewWorkspaceDialog triggerClassName="btn btn-ghost" label="New workspace" />
          }
        >
          <div className="px-4 py-4 text-sm text-ink-muted">
            You are editing{" "}
            <strong className="text-ink">{workspace.name}</strong> at{" "}
            <code className="text-ink-faint">/{workspace.slug}</code>. A new
            workspace starts empty, with its own generic pipeline to edit here.
          </div>
        </Section>
      </div>
    </>
  );
}
