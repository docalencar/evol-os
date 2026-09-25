import {
  AttentionQueue,
  getAttentionQueue,
  presentAttentionQueue,
} from "@/features/manager-intelligence"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function ManagerPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const items =
    await getAttentionQueue(companyId)

  const viewModel = presentAttentionQueue(items)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Liderança
        </h1>

        <p className="mt-2 text-muted-foreground">
          Acompanhe fatos que exigem sua atuação junto às pessoas que respondem diretamente a você.
        </p>
      </div>

      <AttentionQueue
        viewModel={viewModel}
      />
    </div>
  )
}
