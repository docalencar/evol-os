import Link from "next/link"

import type {
  OrganizationClassificationInsight,
} from "../types/organization-classification"


type Props = {
  insight: OrganizationClassificationInsight
}


export function OrganizationClassificationAlert({
  insight,
}: Props) {

  if (
    insight.unassignedDepartments === 0
  ) {
    return null
  }


  return (
    <section
      className="
        rounded-2xl
        border
        border-amber-200
        bg-amber-50
        p-6
      "
    >

      <h3 className="text-lg font-semibold">
        ⚠️ Estrutura pendente de classificação
      </h3>


      <p className="mt-2 text-sm text-muted-foreground">
        {insight.message}
      </p>


      <p className="mt-4 text-sm font-medium">
        Registros encontrados:
      </p>


      <ul className="mt-2 list-disc pl-5 text-sm">
        {insight.suggestedUnits.map(
          (unit) => (
            <li key={unit}>
              {unit}
            </li>
          )
        )}
      </ul>


      <Link
        href="/app/company/organization-analysis"
        className="
          mt-5
          inline-flex
          rounded-lg
          border
          px-4
          py-2
          text-sm
          font-medium
          hover:bg-background
        "
      >
        Analisar estrutura
      </Link>

    </section>
  )
}
