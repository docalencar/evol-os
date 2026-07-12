export type ActionResult<T = void> = {
  success: boolean

  message: string

  data?: T
}

export function successResult<T>(
  message: string,
  data?: T
): ActionResult<T> {
  return {
    success: true,
    message,
    data,
  }
}

export function failureResult(
  message: string
): ActionResult {
  return {
    success: false,
    message,
  }
}
