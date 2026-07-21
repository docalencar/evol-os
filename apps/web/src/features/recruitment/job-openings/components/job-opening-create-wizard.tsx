"use client"

import { useState } from "react"

import {
  ProductWizard,
  ProductWizardActions,
  ProductWizardFooter,
  ProductWizardProgress,
  ProductWizardStep,
  ProductWizardSummary,
  useProductWizard,
  type ProductWizardStepDefinition,
} from "@/components/product/wizard"
import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_PRIORITY_LABELS,
} from "../constants/job-opening-options"
import type {
  JobOpening,
  JobOpeningPriority,
  JobOpeningReason,
} from "../types/job-opening"
import {
  jobOpeningWizardSchema,
} from "../schemas"

type JobOpeningWizardOption = {
  id: string
  name: string
}

type JobOpeningWizardEmployeeOption = {
  id: string
  fullName: string
}

type JobOpeningCreateWizardProps = {
  departments: JobOpeningWizardOption[]
  positions: JobOpeningWizardOption[]
  employees: JobOpeningWizardEmployeeOption[]
}

type JobOpeningWizardValues = {
  openingReason: JobOpening["openingReason"] | null
  departmentId: JobOpening["departmentId"] | null
  positionId: JobOpening["positionId"] | null
  requestingManagerId:
    | JobOpening["requestingManagerId"]
    | null
  recruiterId: JobOpening["recruiterId"]
  approverId: JobOpening["approverId"]
  priority: JobOpening["priority"] | null
  salaryMin: JobOpening["salaryMin"]
  salaryMax: JobOpening["salaryMax"]
  targetHireDate: JobOpening["targetHireDate"]
  notes: JobOpening["notes"]
}

type JobOpeningWizardErrors = Partial<
  Record<keyof JobOpeningWizardValues, string>
>

const INITIAL_VALUES: JobOpeningWizardValues = {
  openingReason: null,
  departmentId: null,
  positionId: null,
  requestingManagerId: null,
  recruiterId: null,
  approverId: null,
  priority: null,
  salaryMin: null,
  salaryMax: null,
  targetHireDate: null,
  notes: null,
}

const reasonOptions: Array<{
  value: JobOpeningReason
  label: string
  description: string
}> = [
  {
    value: "new_position",
    label: "Nova posição",
    description:
      "Criação de uma função que ainda não existe na estrutura.",
  },
  {
    value: "replacement",
    label: "Substituição",
    description:
      "Reposição de um colaborador desligado ou transferido.",
  },
  {
    value: "headcount_growth",
    label: "Expansão",
    description:
      "Ampliação do time para acompanhar o crescimento da operação.",
  },
  {
    value: "temporary_demand",
    label: "Projeto temporário",
    description:
      "Necessidade de reforço por um período ou iniciativa específica.",
  },
  {
    value: "other",
    label: "Banco de talentos",
    description:
      "Mapeamento antecipado de profissionais para oportunidades futuras.",
  },
]

const jobOpeningSteps: ProductWizardStepDefinition[] = [
  {
    id: "1-reason",
    title: "Motivo da vaga",
    description:
      "Conte por que esta oportunidade precisa ser aberta.",
  },
  {
    id: "2-organization",
    title: "Estrutura organizacional",
    description:
      "Posicione a vaga dentro da estrutura da empresa.",
  },
  {
    id: "3-owners",
    title: "Responsáveis",
    description:
      "Indique quem conduzirá e aprovará o processo.",
  },
  {
    id: "4-details",
    title: "Detalhes",
    description:
      "Registre as condições e informações complementares.",
  },
  {
    id: "5-review",
    title: "Revisão",
    description:
      "Confira as escolhas feitas nas etapas anteriores.",
  },
]

const selectClassName = [
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3",
  "text-sm text-slate-900 outline-none transition-colors",
  "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
].join(" ")

export function JobOpeningCreateWizard({
  departments,
  positions,
  employees,
}: JobOpeningCreateWizardProps) {
  const [open, setOpen] = useState(false)
  const [values, setValues] =
    useState<JobOpeningWizardValues>(INITIAL_VALUES)

  const errors = getWizardErrors(values)

  function updateValue<Key extends keyof JobOpeningWizardValues>(
    key: Key,
    value: JobOpeningWizardValues[Key]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      setValues(INITIAL_VALUES)
    }
  }

  const reasonLabel =
    reasonOptions.find(
      (option) => option.value === values.openingReason
    )?.label ?? "Não informado"

  const departmentName = getOptionLabel(
    departments,
    values.departmentId,
    "Não informado"
  )

  const positionName = getOptionLabel(
    positions,
    values.positionId,
    "Não informado"
  )

  const managerName = getEmployeeLabel(
    employees,
    values.requestingManagerId
  )

  const recruiterName = getEmployeeLabel(
    employees,
    values.recruiterId
  )

  const approverName = getEmployeeLabel(
    employees,
    values.approverId
  )

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button className="w-full xl:w-auto">
          Nova vaga
        </Button>
      }
      title="Nova vaga"
      description="Siga as etapas para organizar a criação de uma vaga."
      contentClassName="max-w-4xl"
      bodyClassName="overflow-y-auto"
    >
      <ProductWizard
        key={open ? "open" : "closed"}
        steps={jobOpeningSteps}
      >
        <div className="pb-5">
          <ProductWizardProgress />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          <ProductWizardStep
            id="1-reason"
            title="Motivo da vaga"
            description="Por que esta vaga está sendo aberta?"
            summary={
              <ProductWizardSummary>
                {reasonLabel}
              </ProductWizardSummary>
            }
          >
            <ReasonStep
              value={values.openingReason}
              error={errors.openingReason}
              onChange={(value) =>
                updateValue("openingReason", value)
              }
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="2-organization"
            title="Estrutura organizacional"
            description="Onde esta vaga estará posicionada?"
            summary={
              <ProductWizardSummary>
                {[departmentName, positionName, managerName].join(
                  " · "
                )}
              </ProductWizardSummary>
            }
          >
            <OrganizationStep
              departments={departments}
              positions={positions}
              employees={employees}
              values={values}
              errors={errors}
              onChange={updateValue}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="3-owners"
            title="Responsáveis"
            description="Quem conduzirá e aprovará esta vaga?"
            summary={
              <ProductWizardSummary>
                {[recruiterName, approverName].join(" · ")}
              </ProductWizardSummary>
            }
          >
            <OwnersStep
              employees={employees}
              values={values}
              errors={errors}
              onChange={updateValue}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="4-details"
            title="Detalhes"
            description="Quais condições ajudam a orientar esta contratação?"
            summary={
              <ProductWizardSummary>
                {values.priority
                  ? JOB_OPENING_PRIORITY_LABELS[values.priority]
                  : "Prioridade não informada"}
              </ProductWizardSummary>
            }
          >
            <DetailsStep
              values={values}
              errors={errors}
              onChange={updateValue}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="5-review"
            title="Revisão"
            description="As escolhas representam a vaga que será criada?"
          >
            <ReviewStep
              values={values}
              reasonLabel={reasonLabel}
              departmentName={departmentName}
              positionName={positionName}
              managerName={managerName}
              recruiterName={recruiterName}
              approverName={approverName}
            />
          </ProductWizardStep>
        </div>

        <JobOpeningWizardFooter
          errors={errors}
          onCancel={() => handleOpenChange(false)}
        />
      </ProductWizard>
    </EntityDialog>
  )
}

type WizardChangeHandler = <
  Key extends keyof JobOpeningWizardValues,
>(
  key: Key,
  value: JobOpeningWizardValues[Key]
) => void

function ReasonStep({
  value,
  error,
  onChange,
}: {
  value: JobOpeningWizardValues["openingReason"]
  error?: string
  onChange: (value: JobOpeningReason) => void
}) {
  return (
    <fieldset
      className="space-y-3"
      aria-invalid={Boolean(error)}
    >
      <legend className="sr-only">
        Por que esta vaga está sendo aberta?
      </legend>

      {reasonOptions.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
        >
          <input
            type="radio"
            name="job-opening-reason"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1 h-4 w-4 border-slate-300 text-evol-blue"
          />

          <span>
            <span className="block text-sm font-medium text-slate-900">
              {option.label}
            </span>

            <span className="mt-1 block text-sm leading-5 text-slate-600">
              {option.description}
            </span>
          </span>
        </label>
      ))}

      <FieldError message={error} />
    </fieldset>
  )
}

function OrganizationStep({
  departments,
  positions,
  employees,
  values,
  errors,
  onChange,
}: {
  departments: JobOpeningWizardOption[]
  positions: JobOpeningWizardOption[]
  employees: JobOpeningWizardEmployeeOption[]
  values: JobOpeningWizardValues
  errors: JobOpeningWizardErrors
  onChange: WizardChangeHandler
}) {
  return (
    <div className="space-y-5">
      <WizardSelect
        id="job-opening-department"
        label="Departamento"
        value={values.departmentId}
        placeholder="Selecione um departamento"
        options={departments}
        error={errors.departmentId}
        onChange={(value) =>
          onChange("departmentId", value || null)
        }
      />

      <WizardSelect
        id="job-opening-position"
        label="Cargo"
        value={values.positionId}
        placeholder="Selecione um cargo"
        options={positions}
        error={errors.positionId}
        onChange={(value) =>
          onChange("positionId", value || null)
        }
      />

      <WizardEmployeeSelect
        id="job-opening-manager"
        label="Gestor responsável"
        value={values.requestingManagerId}
        placeholder="Selecione um gestor"
        employees={employees}
        error={errors.requestingManagerId}
        onChange={(value) =>
          onChange("requestingManagerId", value || null)
        }
      />
    </div>
  )
}

function OwnersStep({
  employees,
  values,
  errors,
  onChange,
}: {
  employees: JobOpeningWizardEmployeeOption[]
  values: JobOpeningWizardValues
  errors: JobOpeningWizardErrors
  onChange: WizardChangeHandler
}) {
  return (
    <div className="space-y-5">
      <WizardEmployeeSelect
        id="job-opening-recruiter"
        label="Recruiter"
        value={values.recruiterId}
        placeholder="Selecione um recruiter"
        employees={employees}
        error={errors.recruiterId}
        onChange={(value) =>
          onChange("recruiterId", value || null)
        }
      />

      <WizardEmployeeSelect
        id="job-opening-approver"
        label="Aprovador"
        value={values.approverId}
        placeholder="Selecione um aprovador"
        employees={employees}
        error={errors.approverId}
        onChange={(value) =>
          onChange("approverId", value || null)
        }
      />

      {employees.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600">
          Nenhuma pessoa está disponível para seleção neste momento.
        </p>
      ) : null}
    </div>
  )
}

function DetailsStep({
  values,
  errors,
  onChange,
}: {
  values: JobOpeningWizardValues
  errors: JobOpeningWizardErrors
  onChange: WizardChangeHandler
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="job-opening-priority">Prioridade</Label>

        <select
          id="job-opening-priority"
          value={values.priority ?? ""}
          onChange={(event) =>
            onChange(
              "priority",
              event.target.value
                ? (event.target.value as JobOpeningPriority)
                : null
            )
          }
          className={selectClassName}
          aria-invalid={Boolean(errors.priority)}
        >
          <option value="">Selecione uma prioridade</option>

          {JOB_OPENING_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {JOB_OPENING_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>

        <FieldError message={errors.priority} />
      </div>

      <div className="space-y-2">
        <Label>Faixa salarial</Label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="number"
            inputMode="decimal"
            aria-label="Salário mínimo"
            placeholder="Mínimo"
            value={values.salaryMin ?? ""}
            onChange={(event) =>
              onChange(
                "salaryMin",
                event.target.value
                  ? Number(event.target.value)
                  : null
              )
            }
          />

          <Input
            type="number"
            inputMode="decimal"
            aria-label="Salário máximo"
            placeholder="Máximo"
            value={values.salaryMax ?? ""}
            onChange={(event) =>
              onChange(
                "salaryMax",
                event.target.value
                  ? Number(event.target.value)
                  : null
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-opening-target-date">Data prevista</Label>

        <Input
          id="job-opening-target-date"
          type="date"
          value={values.targetHireDate ?? ""}
          onChange={(event) =>
            onChange(
              "targetHireDate",
              event.target.value || null
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-opening-notes">Observações</Label>

        <Textarea
          id="job-opening-notes"
          rows={5}
          placeholder="Adicione informações que ajudem a contextualizar a vaga."
          value={values.notes ?? ""}
          onChange={(event) =>
            onChange("notes", event.target.value || null)
          }
        />
      </div>
    </div>
  )
}

function ReviewStep({
  values,
  reasonLabel,
  departmentName,
  positionName,
  managerName,
  recruiterName,
  approverName,
}: {
  values: JobOpeningWizardValues
  reasonLabel: string
  departmentName: string
  positionName: string
  managerName: string
  recruiterName: string
  approverName: string
}) {
  const priorityLabel = values.priority
    ? JOB_OPENING_PRIORITY_LABELS[values.priority]
    : "Não informada"

  const salaryRange =
    values.salaryMin || values.salaryMax
      ? `${values.salaryMin || "-"} — ${values.salaryMax || "-"}`
      : "Não informada"

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-slate-50/50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Revise suas escolhas
        </h3>

        <p className="mt-1 text-sm leading-5 text-slate-600">
          Nenhuma informação será salva nesta etapa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Motivo" value={reasonLabel} />
        <ReviewItem label="Departamento" value={departmentName} />
        <ReviewItem label="Cargo" value={positionName} />
        <ReviewItem label="Gestor responsável" value={managerName} />
        <ReviewItem label="Recruiter" value={recruiterName} />
        <ReviewItem label="Aprovador" value={approverName} />
        <ReviewItem label="Prioridade" value={priorityLabel} />
        <ReviewItem label="Faixa salarial" value={salaryRange} />
        <ReviewItem
          label="Data prevista"
          value={values.targetHireDate || "Não informada"}
        />
      </div>

      <ReviewItem
        label="Observações"
        value={values.notes?.trim() || "Não informadas"}
      />
    </div>
  )
}

function WizardSelect({
  id,
  label,
  value,
  placeholder,
  options,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string | null
  placeholder: string
  options: JobOpeningWizardOption[]
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      <FieldError message={error} />
    </div>
  )
}

function WizardEmployeeSelect({
  id,
  label,
  value,
  placeholder,
  employees,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string | null
  placeholder: string
  employees: JobOpeningWizardEmployeeOption[]
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>

        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullName}
          </option>
        ))}
      </select>

      <FieldError message={error} />
    </div>
  )
}

function ReviewItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  )
}

function JobOpeningWizardFooter({
  errors,
  onCancel,
}: {
  errors: JobOpeningWizardErrors
  onCancel: () => void
}) {
  const { currentStepId } = useProductWizard()

  const fieldsByStep: Record<
    string,
    Array<keyof JobOpeningWizardValues>
  > = {
    "1-reason": ["openingReason"],
    "2-organization": [
      "departmentId",
      "positionId",
      "requestingManagerId",
    ],
    "3-owners": ["recruiterId", "approverId"],
    "4-details": ["priority"],
    "5-review": [],
  }

  const currentStepIsInvalid = (
    fieldsByStep[currentStepId] ?? []
  ).some((field) => Boolean(errors[field]))

  return (
    <ProductWizardFooter>
      <ProductWizardActions
        onCancel={onCancel}
        nextLabel="Próximo"
        completeLabel="Próximo"
        disabled={currentStepIsInvalid}
      />
    </ProductWizardFooter>
  )
}

function FieldError({
  message,
}: {
  message?: string
}) {
  if (!message) {
    return null
  }

  return (
    <p className="text-sm text-red-600">
      {message}
    </p>
  )
}

function getWizardErrors(
  values: JobOpeningWizardValues
): JobOpeningWizardErrors {
  const result =
    jobOpeningWizardSchema.safeParse(values)

  if (result.success) {
    return {}
  }

  return result.error.issues.reduce<JobOpeningWizardErrors>(
    (errors, issue) => {
      const field = issue.path[0]

      if (
        typeof field === "string" &&
        field in values &&
        !errors[field as keyof JobOpeningWizardValues]
      ) {
        errors[field as keyof JobOpeningWizardValues] =
          issue.message
      }

      return errors
    },
    {}
  )
}

function getOptionLabel(
  options: JobOpeningWizardOption[],
  selectedId: string | null,
  fallback: string
) {
  return (
    options.find((option) => option.id === selectedId)?.name ??
    fallback
  )
}

function getEmployeeLabel(
  employees: JobOpeningWizardEmployeeOption[],
  selectedId: string | null
) {
  return (
    employees.find((employee) => employee.id === selectedId)
      ?.fullName ?? "Não informado"
  )
}
