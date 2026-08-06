import {
  getCompanyOptions,
  getContactOptions,
  getPipeline,
  getStages,
} from "@/lib/queries";
import { PipelineBoard } from "@/components/pipeline-board";
import { NewLeadDialog } from "@/components/dialogs";
import { PageHeader } from "@/components/ui";
import { money } from "@/lib/format";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [columns, stages, companies, contacts] = await Promise.all([
    getPipeline(),
    getStages(),
    getCompanyOptions(),
    getContactOptions(),
  ]);

  const totalLeads = columns.reduce((sum, c) => sum + c.leads.length, 0);
  const totalValue = columns
    .filter((c) => !c.stage.is_won)
    .reduce((sum, c) => sum + c.value, 0);

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle={
          totalLeads === 0
            ? "Five stages, ready for your first lead."
            : `${totalLeads} active ${totalLeads === 1 ? "lead" : "leads"} · ${money(totalValue)} still in play`
        }
        actions={
          <NewLeadDialog
            stages={stages}
            companies={companies}
            contacts={contacts}
          />
        }
      />

      <div className="pt-5">
        <PipelineBoard columns={columns} />
      </div>

      <p className="px-5 pb-8 text-xs text-ink-faint sm:px-8">
        Drag a card between columns to change its stage, or use the ⋯ menu on a
        card. Lost deals are hidden from the board and stay on the lead record.
      </p>
    </>
  );
}
