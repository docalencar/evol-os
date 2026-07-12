import type {
  DevelopmentMonthlyEvolution,
} from "../types/development-monthly-evolution"

import type {
  DevelopmentPlanListItem,
} from "../types/development-plan-list-item"

function getMonthKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0"
    ),
  ].join("-")
}

function getMonthLabel(date: Date) {
  const month = new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "short",
    }
  )
    .format(date)
    .replace(".", "")

  const formattedMonth =
    month.charAt(0).toUpperCase() +
    month.slice(1)

  const year = String(
    date.getFullYear()
  ).slice(-2)

  return `${formattedMonth}/${year}`
}

function createMonthDate(
  referenceDate: Date,
  monthOffset: number
) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() +
      monthOffset,
    1
  )
}

export function calculateDevelopmentMonthlyEvolution(
  plans: DevelopmentPlanListItem[],
  referenceDate = new Date()
): DevelopmentMonthlyEvolution {
  const months = Array.from(
    { length: 6 },
    (_, index) =>
      createMonthDate(
        referenceDate,
        index - 5
      )
  )

  return months.map((monthDate) => {
    const month = getMonthKey(monthDate)

    const createdPlans = plans.filter(
      (item) => {
        const createdAt = new Date(
          item.plan.createdAt
        )

        return (
          getMonthKey(createdAt) === month
        )
      }
    ).length

    const completedPlans = plans.filter(
      (item) => {
        if (!item.plan.completedAt) {
          return false
        }

        const completedAt = new Date(
          item.plan.completedAt
        )

        return (
          getMonthKey(completedAt) ===
          month
        )
      }
    ).length

    return {
      month,
      label: getMonthLabel(monthDate),
      createdPlans,
      completedPlans,
    }
  })
}
