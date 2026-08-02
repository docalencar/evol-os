import "server-only"

import {
  createExecutiveHomeApplication,
} from "../application/factories/create-executive-home-application"
import {
  CurrentExecutiveHomeSource,
} from "./current-executive-home-source"

export function createServerExecutiveHomeApplication() {
  return createExecutiveHomeApplication(
    new CurrentExecutiveHomeSource(),
  )
}
