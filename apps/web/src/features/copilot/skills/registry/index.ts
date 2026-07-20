import type {
  CopilotSkill,
} from "../types"

import {
  employeeAnalysisSkill,
} from "./employee-analysis"

import {
  executiveSummarySkill,
} from "./executive-summary"

import {
  organizationalRisksSkill,
} from "./organizational-risks"

export {
  employeeAnalysisSkill,
} from "./employee-analysis"

export {
  executiveSummarySkill,
} from "./executive-summary"

export {
  organizationalRisksSkill,
} from "./organizational-risks"

export const copilotSkills: CopilotSkill[] = [
  executiveSummarySkill,
  employeeAnalysisSkill,
  organizationalRisksSkill,
]
