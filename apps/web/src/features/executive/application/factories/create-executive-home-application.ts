import {
  ExecutiveApplicationService,
} from "../executive-application-service"
import {
  ExecutivePresenter,
} from "../../presenters"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "../../queries/executive-query-service"

export function createExecutiveHomeApplication(
  source: ExecutiveHomeSource,
): ExecutiveApplicationService {
  const query =
    new ExecutiveQueryService(source)

  const presenter =
    new ExecutivePresenter()

  return new ExecutiveApplicationService(
    query,
    presenter,
  )
}
