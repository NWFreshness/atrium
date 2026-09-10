import { PipelineBoard } from "@/components/crm/pipeline-board";
import { listDealsAction } from "@/lib/crm/deal-actions";

export default async function PipelinePage() {
  const deals = await listDealsAction();

  return (
    <main>
      <div className="atrium-pagetitle">
        <h1>Pipeline</h1>
        <p className="atrium-sub">Six stages · drag deals to move</p>
      </div>
      <PipelineBoard deals={deals} />
    </main>
  );
}
