import {
  AttentionQueue,
  createAttentionQueue,
  getAttentionQueue,
  presentAttentionQueue,
} from "@/features/manager-intelligence"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function ManagerPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const items =
    await getAttentionQueue(companyId)

  const queue = createAttentionQueue(items)

  const viewModel = presentAttentionQueue(queue)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Manager Workspace
        </h1>

        <p className="mt-2 text-muted-foreground">
          Quem precisa da sua atenção hoje?
        </p>
      </div>

      <AttentionQueue
        viewModel={viewModel}
      />
    </div>
  )
}
