import type {
  EmployeeImportParseResult,
  EmployeeImportPreviewRow,
} from "../types/employee-import-preview"

const PREVIEW_LIMIT = 10

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

function normalizeHeaders(values: unknown[]) {
  return values.map((value, index) => {
    const normalizedValue = normalizeCellValue(value)

    return normalizedValue || `Coluna ${index + 1}`
  })
}

function normalizeRowValues(
  values: unknown[],
  totalColumns: number
) {
  return Array.from(
    { length: totalColumns },
    (_, index) => normalizeCellValue(values[index])
  )
}

export async function parseEmployeeImportXlsx(
  file: File
): Promise<EmployeeImportParseResult> {
  try {
    const XLSX = await import("xlsx")
    const fileBuffer = await file.arrayBuffer()

    const workbook = XLSX.read(fileBuffer, {
      type: "array",
      raw: false,
      cellDates: false,
    })

    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      return {
        success: false,
        message:
          "A planilha Excel não possui nenhuma aba disponível.",
      }
    }

    const worksheet = workbook.Sheets[firstSheetName]

    if (!worksheet) {
      return {
        success: false,
        message:
          "Não foi possível acessar a primeira aba da planilha.",
      }
    }

    const worksheetRows = XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      }
    )

    const meaningfulRows = worksheetRows.filter(
      (row) =>
        Array.isArray(row) &&
        row.some(
          (value) => normalizeCellValue(value).length > 0
        )
    )

    if (meaningfulRows.length < 2) {
      return {
        success: false,
        message:
          "O XLSX deve conter uma linha de cabeçalho e pelo menos um colaborador.",
      }
    }

    const headers = normalizeHeaders(meaningfulRows[0])

    if (headers.length < 2) {
      return {
        success: false,
        message:
          "Não foi possível identificar as colunas da planilha Excel.",
      }
    }

    const rows: EmployeeImportPreviewRow[] =
      meaningfulRows
        .slice(1)
        .map((values, index) => ({
          rowNumber: index + 2,
          values: normalizeRowValues(
            values,
            headers.length
          ),
        }))

    return {
      success: true,
      preview: {
        fileName: file.name,
        format: "xlsx",
        delimiter: null,
        headers,
        rows,
        totalRows: rows.length,
        previewLimit: PREVIEW_LIMIT,
      },
    }
  } catch (error) {
    console.error(
      "Erro ao processar XLSX de colaboradores:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível processar o arquivo XLSX.",
    }
  }
}
