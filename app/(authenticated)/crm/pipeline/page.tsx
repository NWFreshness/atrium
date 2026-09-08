import { PipelineBoard } from "@/components/crm/pipeline-board";
import { listDealsAction } from "@/lib/crm/deal-actions";

export default async function PipelinePage() {
  const deals = await listDealsAction();

  return (
    <main>
      <h1>Pipeline</h1>
      <PipelineBoard deals={deals} />
    </main>
  );
}
