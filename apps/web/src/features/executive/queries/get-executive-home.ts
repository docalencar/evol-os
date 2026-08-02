import "server-only"

import {
  createServerExecutiveHomeApplication,
} from "../server"

export async function getExecutiveHome() {
  const application =
    createServerExecutiveHomeApplication()

  return application.execute()
}
