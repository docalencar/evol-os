import {
  ExecutiveOverview,
  getExecutiveOverview,
} from "@/features/executive"

export default async function ExecutivePage() {
  const overview =
    await getExecutiveOverview()

  return (
    <ExecutiveOverview
      overview={overview}
    />
  )
}
