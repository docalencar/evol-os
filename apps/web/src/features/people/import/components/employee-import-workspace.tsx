"use client"

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"

import { Button } from "@/components/ui/button"

import { mapEmployeeImportHeaders } from "../services/map-employee-import-headers"
import { parseEmployeeImportCsv } from "../services/parse-employee-import-csv"
import { validateEmployeeImportRows } from "../services/validate-employee-import-rows"
import {
  EMPLOYEE_IMPORT_ACCEPTED_EXTENSIONS,
  type EmployeeImportAcceptedExtension,
  type EmployeeImportFileValidationResult,
  type EmployeeImportSelectedFile,
} from "../types/employee-import-file"
import type {
  EmployeeImportMappingResult,
} from "../types/employee-import-mapping"
import type {
  EmployeeImportPreview,
} from "../types/employee-import-preview"
import type {
  EmployeeImportValidationResult,
} from "../types/employee-import-validation"
import {
  EmployeeImportMappingSummary,
} from "./employee-import-mapping-summary"
import {
  EmployeeImportPreviewTable,
} from "./employee-import-preview-table"
import {
  EmployeeImportValidationSummary,
} from "./employee-import-validation-summary"

const MAX_FILE_SIZE_IN_BYTES = 10 * 1024 * 1024

function getFileExtension(fileName: string) {
  const extension = fileName
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase()

  return extension ?? ""
}

function isAcceptedExtension(
  extension: string
): extension is EmployeeImportAcceptedExtension {
  return EMPLOYEE_IMPORT_ACCEPTED_EXTENSIONS.includes(
    extension as EmployeeImportAcceptedExtension
  )
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  const sizeInKilobytes = sizeInBytes / 1024

  if (sizeInKilobytes < 1024) {
    return `${sizeInKilobytes.toFixed(1)} KB`
  }

  return `${(sizeInKilobytes / 1024).toFixed(1)} MB`
}

function validateImportFile(
  file: File
): EmployeeImportFileValidationResult {
  const extension = getFileExtension(file.name)

  if (!isAcceptedExtension(extension)) {
    return {
      success: false,
      message:
        "Formato não suportado. Selecione um arquivo CSV ou XLSX.",
    }
  }

  if (file.size === 0) {
    return {
      success: false,
      message: "O arquivo selecionado está vazio.",
    }
  }

  if (file.size > MAX_FILE_SIZE_IN_BYTES) {
    return {
      success: false,
      message:
        "O arquivo deve ter no máximo 10 MB.",
    }
  }

  return {
    success: true,
    selectedFile: {
      file,
      name: file.name,
      extension,
      sizeInBytes: file.size,
      formattedSize: formatFileSize(file.size),
    },
  }
}

export function EmployeeImportWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] =
    useState<EmployeeImportSelectedFile | null>(null)

  const [preview, setPreview] =
    useState<EmployeeImportPreview | null>(null)

  const [mapping, setMapping] =
    useState<EmployeeImportMappingResult | null>(null)

  const [validation, setValidation] =
    useState<EmployeeImportValidationResult | null>(null)

  const [errorMessage, setErrorMessage] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  function selectFile(file: File | undefined) {
    setErrorMessage("")
    setPreview(null)
    setMapping(null)
    setValidation(null)

    if (!file) {
      return
    }

    const validation = validateImportFile(file)

    if (!validation.success) {
      setSelectedFile(null)
      setErrorMessage(validation.message)
      return
    }

    setSelectedFile(validation.selectedFile)
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    selectFile(event.target.files?.[0])
    event.target.value = ""
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    selectFile(event.dataTransfer.files?.[0])
  }

  function removeSelectedFile() {
    setSelectedFile(null)
    setPreview(null)
    setMapping(null)
    setValidation(null)
    setErrorMessage("")
  }

  async function processSelectedFile() {
    if (!selectedFile) {
      return
    }

    setErrorMessage("")
    setPreview(null)
    setMapping(null)
    setValidation(null)

    if (selectedFile.extension === "xlsx") {
      setErrorMessage(
        "A leitura de XLSX será adicionada em uma etapa posterior. Nesta versão, use um arquivo CSV."
      )
      return
    }

    setIsProcessing(true)

    const result = await parseEmployeeImportCsv(
      selectedFile.file
    )

    setIsProcessing(false)

    if (!result.success) {
      setErrorMessage(result.message)
      return
    }

    const mappingResult = mapEmployeeImportHeaders(
      result.preview.headers
    )

    const validationResult = validateEmployeeImportRows(
      result.preview,
      mappingResult
    )

    setPreview(result.preview)
    setMapping(mappingResult)
    setValidation(validationResult)
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Customer Activation
        </p>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Importar colaboradores
          </h1>

          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Envie uma planilha com os dados essenciais. O Evol OS identifica
            automaticamente as colunas antes de qualquer informação ser salva.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div
            className={[
              "rounded-2xl border-2 border-dashed bg-white p-8 text-center transition-colors sm:p-12",
              isDragging
                ? "border-slate-950 bg-slate-50"
                : "border-slate-300",
            ].join(" ")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleInputChange}
            />

            <div className="mx-auto max-w-md space-y-4">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl"
                aria-hidden="true"
              >
                ↑
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  Arraste sua planilha para cá
                </h2>

                <p className="text-sm leading-6 text-slate-600">
                  Use um arquivo CSV ou XLSX com até 10 MB.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Selecionar arquivo
              </Button>
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {selectedFile ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Arquivo validado
                  </p>

                  <p className="mt-1 truncate font-semibold text-slate-950">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedFile.extension.toUpperCase()} ·{" "}
                    {selectedFile.formattedSize}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={removeSelectedFile}
                >
                  Remover
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Etapa atual
            </p>

            <h2 className="mt-2 font-semibold text-slate-950">
              3. Interpretar colunas
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              O Evol OS procura automaticamente nome, e-mail, telefone,
              departamento, cargo e demais dados conhecidos.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Cabeçalhos reconhecidos
            </p>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>Nome ou Nome completo</p>
              <p>Email ou E-mail</p>
              <p>Telefone ou Celular</p>
              <p>Departamento ou Setor</p>
              <p>Cargo ou Função</p>
              <p>Gestor ou Líder</p>
              <p>Data de admissão</p>
            </div>
          </section>
        </aside>
      </section>

      {selectedFile && !preview ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">
                Arquivo pronto para interpretação
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Deixe o Evol OS entender sua planilha.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                O arquivo será lido, os cabeçalhos serão reconhecidos e uma
                prévia será apresentada para revisão.
              </p>
            </div>

            <Button
              type="button"
              onClick={processSelectedFile}
              disabled={isProcessing}
            >
              {isProcessing
                ? "Processando..."
                : "Processar planilha"}
            </Button>
          </div>
        </section>
      ) : null}

      {mapping ? (
        <EmployeeImportMappingSummary mapping={mapping} />
      ) : null}

      {validation ? (
        <EmployeeImportValidationSummary
          validation={validation}
        />
      ) : null}

      {preview ? (
        <EmployeeImportPreviewTable preview={preview} />
      ) : null}
    </main>
  )
}
