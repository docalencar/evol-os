import type { TalentOverview } from "../../types/talent-overview"

type TalentOverviewProps = {
  overview: TalentOverview
}

function Card({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  )
}

export function TalentOverview({
  overview,
}: TalentOverviewProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Talent Overview
        </h2>

        <p className="text-sm text-muted-foreground">
          Distribuição atual dos talentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Prontos para promoção"
          value={overview.promotionReady}
        />

        <Card
          title="Em desenvolvimento"
          value={overview.developing}
        />

        <Card
          title="Precisam de atenção"
          value={overview.attention}
        />
      </div>
    </section>
  )
}
