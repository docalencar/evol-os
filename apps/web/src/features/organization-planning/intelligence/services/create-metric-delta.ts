import type {
  MetricDelta,
  MetricDeltaDirection,
} from "../types"

function roundPercentage(
  value: number
) {
  return Math.round(
    value * 100
  ) / 100
}

function resolveDirection(
  absolute: number
): MetricDeltaDirection {
  if (absolute > 0) {
    return "increase"
  }

  if (absolute < 0) {
    return "decrease"
  }

  return "unchanged"
}

export function createMetricDelta(
  current: number,
  projected: number
): MetricDelta {
  const absolute =
    projected - current

  const percentage =
    current === 0
      ? absolute === 0
        ? 0
        : null
      : roundPercentage(
          (
            absolute /
            current
          ) * 100
        )

  return Object.freeze({
    current,
    projected,
    absolute,
    percentage,
    direction:
      resolveDirection(
        absolute
      ),
  })
}
