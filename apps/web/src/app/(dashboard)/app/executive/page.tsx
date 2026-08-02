import { ExecutiveHome } from "@/features/executive"

import { getExecutiveHome } from "@/features/executive/queries/get-executive-home"

export default async function ExecutivePage() {
  const executive = await getExecutiveHome()

  return <ExecutiveHome data={executive} />
}
