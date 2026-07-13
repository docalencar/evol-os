import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../../types/position"

export const hierarchicalLevelOptions: Array<{
  value: PositionHierarchicalLevel
  label: string
}> = [
  {
    value: "intern",
    label: "Estagiário",
  },
  {
    value: "assistant",
    label: "Assistente",
  },
  {
    value: "analyst",
    label: "Analista",
  },
  {
    value: "specialist",
    label: "Especialista",
  },
  {
    value: "coordinator",
    label: "Coordenador",
  },
  {
    value: "supervisor",
    label: "Supervisor",
  },
  {
    value: "manager",
    label: "Gerente",
  },
  {
    value: "director",
    label: "Diretor",
  },
  {
    value: "executive",
    label: "Executivo",
  },
]

export const statusOptions: Array<{
  value: PositionStatus
  label: string
}> = [
  {
    value: "draft",
    label: "Rascunho",
  },
  {
    value: "active",
    label: "Ativo",
  },
  {
    value: "inactive",
    label: "Inativo",
  },
  {
    value: "obsolete",
    label: "Obsoleto",
  },
]

export const workModelOptions: Array<{
  value: PositionWorkModel
  label: string
}> = [
  {
    value: "on_site",
    label: "Presencial",
  },
  {
    value: "hybrid",
    label: "Híbrido",
  },
  {
    value: "remote",
    label: "Remoto",
  },
]

export const employmentTypeOptions: Array<{
  value: PositionEmploymentType
  label: string
}> = [
  {
    value: "clt",
    label: "CLT",
  },
  {
    value: "pj",
    label: "PJ",
  },
  {
    value: "intern",
    label: "Estágio",
  },
  {
    value: "apprentice",
    label: "Aprendiz",
  },
  {
    value: "temporary",
    label: "Temporário",
  },
  {
    value: "outsourced",
    label: "Terceirizado",
  },
  {
    value: "contractor",
    label: "Prestador de serviço",
  },
  {
    value: "other",
    label: "Outro",
  },
]

export const travelRequirementOptions: Array<{
  value: PositionTravelRequirement
  label: string
}> = [
  {
    value: "none",
    label: "Não exige",
  },
  {
    value: "occasional",
    label: "Eventualmente",
  },
  {
    value: "frequent",
    label: "Frequentemente",
  },
]

export const positionSelectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"