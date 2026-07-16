"use client"

import Link from "next/link"
import {
  useMemo,
  useState,
  useTransition,
} from "react"

import {
  OrganizationSyncDryRun,
  OrganizationSyncReview,
  OrganizationSyncWorkspaceSummary,
} from "@/features/organization/sync"
import { Button } from "@/components/ui/button"

import {
  createEmployeeImportSyncPlanAction,
  type EmployeeImportSyncPlanResult,
} from "../actions/create-employee-import-sync-plan-action"
import {
  applyOrganizationSyncPlanAction,
  type ApplyOrganizationSyncPlanActionResult,
} from "../actions/apply-organization-sync-plan-action"
import type {
  EmployeeImportActionRow,
} from "../types/employee-import-action"
import type {
  EmployeeImportValidationResult,
} from "../types/employee-import-validation"

type EmployeeImportActionPanelProps = {
  validation: EmployeeImportValidationResult
}

function createActionRows(
  validation: EmployeeImportValidationResult
): EmployeeImportActionRow[] {
  return validation.rows
    .filter(
      (row) => row.status !== "invalid"
    )
    .map((row) => ({
      rowNumber: row.rowNumber,
      values: row.values,
    }))
}

export function EmployeeImportActionPanel({
  validation,
}: EmployeeImportActionPanelProps) {
  const [isPending, startTransition] =
    useTransition()

  const [planResult, setPlanResult] =
    useState<EmployeeImportSyncPlanResult | null>(
      null
    )

  const [result, setResult] =
    useState<ApplyOrganizationSyncPlanActionResult | null>(
      null
    )

  const rows = useMemo(
    () => createActionRows(validation),
    [validation]
  )

  const importableRows =
    validation.validRows +
    validation.warningRows

  function handleAnalyze() {
    startTransition(async () => {
      const actionResult =
        await createEmployeeImportSyncPlanAction(
          rows
        )

      setPlanResult(actionResult)
    })
  }

  function handleImport() {
    if (!planResult?.success) {
      return
    }

    startTransition(async () => {
      const actionResult =
        await applyOrganizationSyncPlanAction(
          planResult.plan
        )

      setResult(actionResult)
    })
  }

  if (result) {
    return (
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
        <div>
          <p className="text-sm font-medium text-slate-300">
            Sincronização concluída
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            {result.message}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-2xl font-bold">
              {result.totalItems}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Itens no plano
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-2xl font-bold">
              {result.appliedItems}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Aplicados
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-2xl font-bold">
              {result.skippedItems}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Ignorados
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-2xl font-bold">
              {result.failedItems}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Com erro
            </p>
          </div>
        </div>

        {result.errors.length > 0 ? (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-white/10 p-4">
            <p className="text-sm font-semibold">
              Avisos da sincronização
            </p>

            {result.errors.map(
              (error, index) => (
                <p
                  key={`${error.itemId}-${index}`}
                  className="text-sm leading-6 text-slate-300"
                >
                  {error.entity} ·{" "}
                  {error.operation}:{" "}
                  {error.message}
                </p>
              )
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app/people"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
          >
            Ver colaboradores
          </Link>

          <button
            type="button"
            onClick={() => {
              setResult(null)
              setPlanResult(null)
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Sincronizar outra planilha
          </button>
        </div>
      </section>
    )
  }

  if (planResult?.success) {
    return (
      <section className="space-y-6">
        <OrganizationSyncWorkspaceSummary
          workspace={
            planResult.workspace
          }
        />

        <OrganizationSyncReview
          review={planResult.review}
        />

        <OrganizationSyncDryRun
          dryRun={planResult.dryRun}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">
                Confirmação humana
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Aplique somente depois de
                revisar o plano.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Nesta primeira integração, o
                plano identifica novos
                colaboradores, departamentos e
                cargos. Atualizações de pessoas
                existentes serão adicionadas nas
                próximas PRs.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setPlanResult(null)
                }
                disabled={isPending}
              >
                Voltar
              </Button>

              <Button
                type="button"
                onClick={handleImport}
                disabled={
                  isPending ||
                  !validation.canImport ||
                  importableRows === 0 ||
                  !planResult.workspace.canApply ||
                  planResult.dryRun.decision
                    .status === "blocked"
                }
              >
                {isPending
                  ? "Aplicando..."
                  : "Aplicar sincronização"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">
            Pronto para analisar
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {importableRows} colaborador
            {importableRows === 1 ? "" : "es"}{" "}
            será
            {importableRows === 1 ? "" : "ão"}{" "}
            comparado
            {importableRows === 1 ? "" : "s"}{" "}
            com a organização atual.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Nenhuma informação será salva nesta
            etapa. O Evol OS criará um plano para
            revisão antes da confirmação.
          </p>

          {planResult &&
          !planResult.success ? (
            <p className="mt-3 text-sm text-red-200">
              {planResult.message}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={
            isPending ||
            !validation.canImport ||
            importableRows === 0
          }
        >
          {isPending
            ? "Analisando..."
            : "Analisar mudanças"}
        </Button>
      </div>
    </section>
  )
}
