import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"
import { Badge } from "@/components/ui/badge"

import type {
  OrganizationSyncReviewViewModel,
} from "../view-models/organization-sync-review-view-model"

type OrganizationSyncReviewProps = {
  review: OrganizationSyncReviewViewModel
}

function getBadgeLabel(
  severity: "info" | "warning" | "critical"
) {
  switch (severity) {
    case "critical":
      return "Crítico"

    case "warning":
      return "Revisar"

    default:
      return "Informação"
  }
}

export function OrganizationSyncReview({
  review,
}: OrganizationSyncReviewProps) {
  return (
    <DashboardSection
      title="Revisão das mudanças"
      description={`${review.reviewItems} item${
        review.reviewItems === 1 ? "" : "s"
      } exige${
        review.reviewItems === 1 ? "" : "m"
      } atenção antes da sincronização.`}
    >
      <div className="space-y-4">
        {review.groups.map((group) => (
          <section
            key={group.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="font-semibold text-slate-900">
                {group.title}
              </h3>

              <span className="text-sm text-slate-500">
                {group.itemCount}
              </span>
            </header>

            <div className="divide-y divide-slate-100">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {item.title}
                      </p>

                      <Badge>
                        {item.operationLabel}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {getBadgeLabel(item.severity)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))}

        {review.totalItems === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Nenhum item disponível para revisão.
          </div>
        ) : null}
      </div>
    </DashboardSection>
  )
}
