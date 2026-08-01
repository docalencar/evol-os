import {
  ExecutiveHome,
  getExecutiveHome,
} from "@/features/executive"

export default async function ExecutivePage() {
  const executive = await getExecutiveHome()

  return <ExecutiveHome data={executive} />
}
