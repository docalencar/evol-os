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
  JOB_OPENING_EMPLOYMENT_TYPES,
  JOB_OPENING_EMPLOYMENT_TYPE_LABELS,
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_PRIORITY_LABELS,
  JOB_OPENING_REASONS,
  JOB_OPENING_REASON_LABELS,
  JOB_OPENING_WORK_MODELS,
  JOB_OPENING_WORK_MODEL_LABELS,
} from "../constants/job-opening-options"
import { jobOpeningWizardSchema } from "../schemas"
import type {
  JobOpening,
  JobOpeningEmploymentType,
  JobOpeningPriority,
  JobOpeningWorkModel,
} from "../types/job-opening"

type WizardOption = { id: string; name: string }
type WizardEmployeeOption = { id: string; fullName: string }

type JobOpeningCreateWizardProps = {
  departments: WizardOption[]
  positions: WizardOption[]
  employees: WizardEmployeeOption[]
}

type JobOpeningWizardValues = {
  title: JobOpening["title"]
  description: JobOpening["description"]
  departmentId: JobOpening["departmentId"] | null
  positionId: JobOpening["positionId"] | null
  requestingManagerId: JobOpening["requestingManagerId"] | null
  recruiterId: JobOpening["recruiterId"]
  openingReason: JobOpening["openingReason"] | null
  replacedEmployeeId: JobOpening["replacedEmployeeId"]
  openingJustification: JobOpening["openingJustification"]
  positionsCount: JobOpening["positionsCount"] | null
  currentHeadcount: JobOpening["currentHeadcount"] | null
  targetHeadcount: JobOpening["targetHeadcount"] | null
  workModel: JobOpening["workModel"] | null
  employmentType: JobOpening["employmentType"] | null
  salaryMin: JobOpening["salaryMin"]
  salaryMax: JobOpening["salaryMax"]
  priority: JobOpening["priority"] | null
  targetHireDate: JobOpening["targetHireDate"]
  notes: JobOpening["notes"]
  isBudgeted: JobOpening["isBudgeted"] | null
}

type WizardErrors = Partial<
  Record<keyof JobOpeningWizardValues, string>
>

type WizardChange = <Key extends keyof JobOpeningWizardValues>(
  key: Key,
  value: JobOpeningWizardValues[Key]
) => void

const INITIAL_VALUES: JobOpeningWizardValues = {
  title: "",
  description: "",
  departmentId: null,
  positionId: null,
  requestingManagerId: null,
  recruiterId: null,
  openingReason: null,
  replacedEmployeeId: null,
  openingJustification: "",
  positionsCount: null,
  currentHeadcount: null,
  targetHeadcount: null,
  workModel: null,
  employmentType: null,
  salaryMin: null,
  salaryMax: null,
  priority: null,
  targetHireDate: null,
  notes: null,
  isBudgeted: null,
}

const steps: ProductWizardStepDefinition[] = [
  { id: "1-reason", title: "Motivo", description: "Explique a necessidade da vaga." },
  { id: "2-identification", title: "Identificação", description: "Apresente a oportunidade com clareza." },
  { id: "3-organization", title: "Estrutura organizacional", description: "Posicione a vaga na organização." },
  { id: "4-sizing", title: "Dimensionamento", description: "Informe o impacto esperado no quadro." },
  { id: "5-conditions", title: "Condições da vaga", description: "Defina as condições da oportunidade." },
  { id: "6-planning", title: "Responsável e planejamento", description: "Organize a condução da vaga." },
  { id: "7-review", title: "Revisão", description: "Confira todo o contrato informado." },
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
  const [values, setValues] = useState(INITIAL_VALUES)
  const errors = getErrors(values)

  function updateValue<Key extends keyof JobOpeningWizardValues>(
    key: Key,
    value: JobOpeningWizardValues[Key]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setValues(INITIAL_VALUES)
  }

  const labels = {
    reason: values.openingReason
      ? JOB_OPENING_REASON_LABELS[values.openingReason]
      : "Não informado",
    department: optionLabel(departments, values.departmentId),
    position: optionLabel(positions, values.positionId),
    manager: employeeLabel(employees, values.requestingManagerId),
    recruiter: employeeLabel(employees, values.recruiterId),
    replacedEmployee: employeeLabel(employees, values.replacedEmployeeId),
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={<Button className="w-full xl:w-auto">Nova vaga</Button>}
      title="Nova vaga"
      description="Siga as etapas para organizar a criação de uma vaga."
      contentClassName="max-w-4xl"
      bodyClassName="overflow-y-auto"
    >
      <ProductWizard key={open ? "open" : "closed"} steps={steps}>
        <div className="pb-5"><ProductWizardProgress /></div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          <ProductWizardStep
            id="1-reason"
            title="Motivo"
            description="Por que esta vaga está sendo aberta?"
            summary={<ProductWizardSummary>{labels.reason}</ProductWizardSummary>}
          >
            <ReasonStep values={values} errors={errors} employees={employees} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="2-identification"
            title="Identificação"
            description="Como esta oportunidade será apresentada?"
            summary={<ProductWizardSummary>{values.title || "Título não informado"}</ProductWizardSummary>}
          >
            <IdentificationStep values={values} errors={errors} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="3-organization"
            title="Estrutura organizacional"
            description="Onde esta vaga estará posicionada?"
            summary={<ProductWizardSummary>{[labels.department, labels.position, labels.manager].join(" · ")}</ProductWizardSummary>}
          >
            <OrganizationStep values={values} errors={errors} departments={departments} positions={positions} employees={employees} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="4-sizing"
            title="Dimensionamento"
            description="Como esta abertura altera o quadro da organização?"
          >
            <SizingStep values={values} errors={errors} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="5-conditions"
            title="Condições da vaga"
            description="Quais condições definem esta oportunidade?"
          >
            <ConditionsStep values={values} errors={errors} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="6-planning"
            title="Responsável e planejamento"
            description="Quem conduzirá a vaga e qual é o planejamento?"
            summary={<ProductWizardSummary>{labels.recruiter}</ProductWizardSummary>}
          >
            <PlanningStep values={values} errors={errors} employees={employees} onChange={updateValue} />
          </ProductWizardStep>

          <ProductWizardStep
            id="7-review"
            title="Revisão"
            description="As informações representam a vaga que será criada?"
          >
            <ReviewStep values={values} labels={labels} />
          </ProductWizardStep>
        </div>

        <WizardFooter errors={errors} onCancel={() => handleOpenChange(false)} />
      </ProductWizard>
    </EntityDialog>
  )
}

function ReasonStep({ values, errors, employees, onChange }: {
  values: JobOpeningWizardValues
  errors: WizardErrors
  employees: WizardEmployeeOption[]
  onChange: WizardChange
}) {
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2" aria-invalid={Boolean(errors.openingReason)}>
        <legend className="sr-only">Motivo da vaga</legend>
        {JOB_OPENING_REASONS.map((reason) => (
          <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-slate-50">
            <input type="radio" name="opening-reason" checked={values.openingReason === reason} onChange={() => {
              onChange("openingReason", reason)
              if (reason !== "replacement") onChange("replacedEmployeeId", null)
            }} />
            <span className="text-sm font-medium">{JOB_OPENING_REASON_LABELS[reason]}</span>
          </label>
        ))}
        <FieldError message={errors.openingReason} />
      </fieldset>

      <Field label="Justificativa" id="opening-justification" error={errors.openingJustification}>
        <Textarea id="opening-justification" rows={5} value={values.openingJustification} onChange={(event) => onChange("openingJustification", event.target.value)} />
      </Field>

      {values.openingReason === "replacement" ? (
        <EmployeeSelect id="replaced-employee" label="Pessoa substituída" value={values.replacedEmployeeId} employees={employees} error={errors.replacedEmployeeId} onChange={(value) => onChange("replacedEmployeeId", value)} />
      ) : null}
    </div>
  )
}

function IdentificationStep({ values, errors, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Título" id="opening-title" error={errors.title}>
        <Input id="opening-title" value={values.title} onChange={(event) => onChange("title", event.target.value)} placeholder="Ex.: Analista de Recursos Humanos" />
      </Field>
      <Field label="Descrição" id="opening-description" error={errors.description}>
        <Textarea id="opening-description" rows={7} value={values.description} onChange={(event) => onChange("description", event.target.value)} />
      </Field>
    </div>
  )
}

function OrganizationStep({ values, errors, departments, positions, employees, onChange }: StepProps & {
  departments: WizardOption[]
  positions: WizardOption[]
  employees: WizardEmployeeOption[]
}) {
  return (
    <div className="space-y-5">
      <OptionSelect id="opening-department" label="Departamento" value={values.departmentId} options={departments} error={errors.departmentId} onChange={(value) => onChange("departmentId", value)} />
      <OptionSelect id="opening-position" label="Cargo" value={values.positionId} options={positions} error={errors.positionId} onChange={(value) => onChange("positionId", value)} />
      <EmployeeSelect id="opening-manager" label="Gestor responsável" value={values.requestingManagerId} employees={employees} error={errors.requestingManagerId} onChange={(value) => onChange("requestingManagerId", value)} />
    </div>
  )
}

function SizingStep({ values, errors, onChange }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <NumberField id="positions-count" label="Quantidade de posições" value={values.positionsCount} error={errors.positionsCount} onChange={(value) => onChange("positionsCount", value)} />
      <NumberField id="current-headcount" label="Quadro atual" value={values.currentHeadcount} error={errors.currentHeadcount} onChange={(value) => onChange("currentHeadcount", value)} />
      <NumberField id="target-headcount" label="Quadro ideal" value={values.targetHeadcount} error={errors.targetHeadcount} onChange={(value) => onChange("targetHeadcount", value)} />
    </div>
  )
}

function ConditionsStep({ values, errors, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <EnumSelect id="work-model" label="Modelo de trabalho" value={values.workModel} options={JOB_OPENING_WORK_MODELS.map((value) => ({ value, label: JOB_OPENING_WORK_MODEL_LABELS[value] }))} error={errors.workModel} onChange={(value) => onChange("workModel", value as JobOpeningWorkModel | null)} />
      <EnumSelect id="employment-type" label="Regime de contratação" value={values.employmentType} options={JOB_OPENING_EMPLOYMENT_TYPES.map((value) => ({ value, label: JOB_OPENING_EMPLOYMENT_TYPE_LABELS[value] }))} error={errors.employmentType} onChange={(value) => onChange("employmentType", value as JobOpeningEmploymentType | null)} />
      <EnumSelect id="is-budgeted" label="Prevista no orçamento" value={values.isBudgeted === null ? null : String(values.isBudgeted)} options={[{ value: "true", label: "Sim" }, { value: "false", label: "Não" }]} error={errors.isBudgeted} onChange={(value) => onChange("isBudgeted", value === null ? null : value === "true")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField id="salary-min" label="Salário mínimo" value={values.salaryMin} error={errors.salaryMin} onChange={(value) => onChange("salaryMin", value)} />
        <NumberField id="salary-max" label="Salário máximo" value={values.salaryMax} error={errors.salaryMax} onChange={(value) => onChange("salaryMax", value)} />
      </div>
    </div>
  )
}

function PlanningStep({ values, errors, employees, onChange }: StepProps & { employees: WizardEmployeeOption[] }) {
  return (
    <div className="space-y-5">
      <EmployeeSelect id="opening-recruiter" label="Recruiter" value={values.recruiterId} employees={employees} error={errors.recruiterId} onChange={(value) => onChange("recruiterId", value)} />
      <EnumSelect id="opening-priority" label="Prioridade" value={values.priority} options={JOB_OPENING_PRIORITIES.map((value) => ({ value, label: JOB_OPENING_PRIORITY_LABELS[value] }))} error={errors.priority} onChange={(value) => onChange("priority", value as JobOpeningPriority | null)} />
      <Field label="Data prevista" id="target-date" error={errors.targetHireDate}>
        <Input id="target-date" type="date" value={values.targetHireDate ?? ""} onChange={(event) => onChange("targetHireDate", event.target.value || null)} />
      </Field>
      <Field label="Observações" id="opening-notes" error={errors.notes}>
        <Textarea id="opening-notes" rows={5} value={values.notes ?? ""} onChange={(event) => onChange("notes", event.target.value || null)} />
      </Field>
    </div>
  )
}

type ReviewLabels = {
  reason: string
  department: string
  position: string
  manager: string
  recruiter: string
  replacedEmployee: string
}

function ReviewStep({ values, labels }: { values: JobOpeningWizardValues; labels: ReviewLabels }) {
  const items = [
    ["Motivo", labels.reason],
    ["Justificativa", values.openingJustification || "Não informada"],
    ...(values.openingReason === "replacement" ? [["Pessoa substituída", labels.replacedEmployee]] : []),
    ["Título", values.title || "Não informado"],
    ["Descrição", values.description || "Não informada"],
    ["Departamento", labels.department],
    ["Cargo", labels.position],
    ["Gestor responsável", labels.manager],
    ["Quantidade de posições", numberLabel(values.positionsCount)],
    ["Quadro atual", numberLabel(values.currentHeadcount)],
    ["Quadro ideal", numberLabel(values.targetHeadcount)],
    ["Modelo de trabalho", values.workModel ? JOB_OPENING_WORK_MODEL_LABELS[values.workModel] : "Não informado"],
    ["Regime", values.employmentType ? JOB_OPENING_EMPLOYMENT_TYPE_LABELS[values.employmentType] : "Não informado"],
    ["Prevista no orçamento", values.isBudgeted === null ? "Não informado" : values.isBudgeted ? "Sim" : "Não"],
    ["Faixa salarial", values.salaryMin !== null || values.salaryMax !== null ? `${numberLabel(values.salaryMin)} — ${numberLabel(values.salaryMax)}` : "Não informada"],
    ["Recruiter", labels.recruiter],
    ["Prioridade", values.priority ? JOB_OPENING_PRIORITY_LABELS[values.priority] : "Não informada"],
    ["Data prevista", values.targetHireDate ?? "Não informada"],
    ["Observações", values.notes ?? "Não informadas"],
  ]

  return <div className="grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <ReviewItem key={label} label={label} value={value} />)}</div>
}

type StepProps = { values: JobOpeningWizardValues; errors: WizardErrors; onChange: WizardChange }

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}<FieldError message={error} /></div>
}

function OptionSelect({ id, label, value, options, error, onChange }: { id: string; label: string; value: string | null; options: WizardOption[]; error?: string; onChange: (value: string | null) => void }) {
  return <Field label={label} id={id} error={error}><select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className={selectClassName} aria-invalid={Boolean(error)}><option value="">Selecione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
}

function EmployeeSelect({ id, label, value, employees, error, onChange }: { id: string; label: string; value: string | null; employees: WizardEmployeeOption[]; error?: string; onChange: (value: string | null) => void }) {
  return <Field label={label} id={id} error={error}><select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className={selectClassName} aria-invalid={Boolean(error)}><option value="">Selecione</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select></Field>
}

function EnumSelect({ id, label, value, options, error, onChange }: { id: string; label: string; value: string | null; options: Array<{ value: string; label: string }>; error?: string; onChange: (value: string | null) => void }) {
  return <Field label={label} id={id} error={error}><select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className={selectClassName} aria-invalid={Boolean(error)}><option value="">Selecione</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
}

function NumberField({ id, label, value, error, onChange }: { id: string; label: string; value: number | null; error?: string; onChange: (value: number | null) => void }) {
  return <Field label={label} id={id} error={error}><Input id={id} type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} aria-invalid={Boolean(error)} /></Field>
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1 rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="break-words whitespace-pre-wrap text-sm font-medium text-slate-900">{value}</p></div>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null
}

function WizardFooter({ errors, onCancel }: { errors: WizardErrors; onCancel: () => void }) {
  const { currentStepId } = useProductWizard()
  const fields: Record<string, Array<keyof JobOpeningWizardValues>> = {
    "1-reason": ["openingReason", "openingJustification", "replacedEmployeeId"],
    "2-identification": ["title", "description"],
    "3-organization": ["departmentId", "positionId", "requestingManagerId"],
    "4-sizing": ["positionsCount", "currentHeadcount", "targetHeadcount"],
    "5-conditions": ["workModel", "employmentType", "isBudgeted", "salaryMin", "salaryMax"],
    "6-planning": ["recruiterId", "priority", "targetHireDate", "notes"],
    "7-review": [],
  }
  const disabled = (fields[currentStepId] ?? []).some((field) => Boolean(errors[field]))
  return <ProductWizardFooter><ProductWizardActions onCancel={onCancel} nextLabel="Próximo" completeLabel="Próximo" disabled={disabled} /></ProductWizardFooter>
}

function getErrors(values: JobOpeningWizardValues): WizardErrors {
  const result = jobOpeningWizardSchema.safeParse(values)
  if (result.success) return {}
  return result.error.issues.reduce<WizardErrors>((errors, issue) => {
    const field = issue.path[0]
    if (typeof field === "string" && field in values && !errors[field as keyof JobOpeningWizardValues]) errors[field as keyof JobOpeningWizardValues] = issue.message
    return errors
  }, {})
}

function optionLabel(options: WizardOption[], id: string | null) {
  return options.find((option) => option.id === id)?.name ?? "Não informado"
}

function employeeLabel(options: WizardEmployeeOption[], id: string | null) {
  return options.find((option) => option.id === id)?.fullName ?? "Não informado"
}

function numberLabel(value: number | null) {
  return value === null ? "Não informado" : String(value)
}
