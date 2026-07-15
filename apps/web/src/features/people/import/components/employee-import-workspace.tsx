"use client"

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"

import { Button } from "@/components/ui/button"

import {
  EMPLOYEE_IMPORT_ACCEPTED_EXTENSIONS,
  type EmployeeImportAcceptedExtension,
  type EmployeeImportFileValidationResult,
  type EmployeeImportSelectedFile,
} from "../types/employee-import-file"

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

  const [errorMessage, setErrorMessage] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  function selectFile(file: File | undefined) {
    setErrorMessage("")

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
    setErrorMessage("")
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Customer Activation
        </p>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Importar colaboradores
          </h1>

          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Envie uma planilha com os dados essenciais. Antes de importar,
            o Evol OS mostrará uma prévia e indicará informações que precisam
            de revisão.
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
              1. Selecionar planilha
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Nesta etapa validamos apenas o formato e o tamanho do arquivo.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Próximas etapas
            </p>

            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  2
                </span>

                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Ler os dados
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Identificar colunas e transformar as linhas.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  3
                </span>

                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Revisar a prévia
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Corrigir dados inválidos antes da importação.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  4
                </span>

                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Importar colaboradores
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Salvar somente registros válidos e confirmados.
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </section>

      {selectedFile ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white">
          <p className="text-sm font-medium text-slate-300">
            Arquivo pronto para leitura
          </p>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                O formato foi validado com sucesso.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Na próxima PR, o Evol OS irá ler o CSV e preparar os dados
                para a primeira prévia da importação.
              </p>
            </div>

            <Button type="button" disabled>
              Processar planilha
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
