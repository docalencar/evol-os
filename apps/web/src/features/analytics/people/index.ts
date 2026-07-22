export {
  getPeopleAnalyticsDashboard,
} from "./queries/get-people-analytics-dashboard"
export {
  presentPeopleAnalyticsDashboard,
} from "./presenters/present-people-analytics-dashboard"
export {
  PeopleAnalyticsDashboardWidget,
} from "./widgets/people-analytics-dashboard"
export {
  getSmartPeopleIndicators,
} from "./queries/get-smart-people-indicators"
export {
  presentSmartPeopleIndicators,
} from "./presenters/present-smart-people-indicators"
export {
  SmartPeopleIndicatorsWidget,
} from "./widgets/smart-people-indicators"

export type {
  OrganizationOccupancy,
  PeopleAnalyticsDashboard,
  PeopleAnalyticsDashboardViewModel,
} from "./types/people-analytics-dashboard"
export type {
  SmartIndicatorStatus,
  SmartIndicatorTrend,
  SmartIndicatorViewModel,
  SmartPeopleIndicators,
  SmartPeopleIndicatorsViewModel,
} from "./types/smart-indicator"
