import { z } from "zod"

export function resolvePositionBackLink(fromPositionId: string | undefined) {
  const positionId = z.string().uuid().safeParse(fromPositionId)

  if (!positionId.success) {
    return null
  }

  return {
    href: `/app/company/positions/${positionId.data}`,
    label: "Voltar para o cargo",
  }
}
