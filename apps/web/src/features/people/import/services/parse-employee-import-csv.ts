import type {
  EmployeeImportCsvDelimiter,
  EmployeeImportParseResult,
  EmployeeImportPreviewRow,
} from "../types/employee-import-preview"

const PREVIEW_LIMIT = 10

function removeByteOrderMark(value: string) {
  return value.replace(/^\uFEFF/, "")
}

function countDelimiterOutsideQuotes(
  line: string,
  delimiter: EmployeeImportCsvDelimiter
) {
  let count = 0
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      const nextCharacter = line[index + 1]

      if (insideQuotes && nextCharacter === '"') {
        index += 1
        continue
      }

      insideQuotes = !insideQuotes
      continue
    }

    if (!insideQuotes && character === delimiter) {
      count += 1
    }
  }

  return count
}

function detectDelimiter(
  content: string
): EmployeeImportCsvDelimiter {
  const firstMeaningfulLine =
    content
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? ""

  const delimiters: EmployeeImportCsvDelimiter[] = [
    ";",
    ",",
    "\t",
  ]

  return delimiters.reduce<EmployeeImportCsvDelimiter>(
    (currentDelimiter, candidateDelimiter) => {
      const currentCount = countDelimiterOutsideQuotes(
        firstMeaningfulLine,
        currentDelimiter
      )

      const candidateCount = countDelimiterOutsideQuotes(
        firstMeaningfulLine,
        candidateDelimiter
      )

      return candidateCount > currentCount
        ? candidateDelimiter
        : currentDelimiter
    },
    ","
  )
}

function parseCsvRows(
  content: string,
  delimiter: EmployeeImportCsvDelimiter
) {
  const rows: string[][] = []

  let currentRow: string[] = []
  let currentValue = ""
  let insideQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const nextCharacter = content[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
        continue
      }

      insideQuotes = !insideQuotes
      continue
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentValue.trim())
      currentValue = ""
      continue
    }

    if (
      !insideQuotes &&
      (character === "\n" || character === "\r")
    ) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      currentRow.push(currentValue.trim())

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow)
      }

      currentRow = []
      currentValue = ""
      continue
    }

    currentValue += character
  }

  if (insideQuotes) {
    throw new Error(
      "O CSV possui um campo entre aspas que não foi encerrado."
    )
  }

  currentRow.push(currentValue.trim())

  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

function normalizeHeaders(headers: string[]) {
  return headers.map((header, index) => {
    const normalizedHeader = header.trim()

    return normalizedHeader || `Coluna ${index + 1}`
  })
}

function normalizeRowValues(
  values: string[],
  totalColumns: number
) {
  return Array.from(
    { length: totalColumns },
    (_, index) => values[index]?.trim() ?? ""
  )
}

export async function parseEmployeeImportCsv(
  file: File
): Promise<EmployeeImportParseResult> {
  try {
    const rawContent = await file.text()
    const content = removeByteOrderMark(rawContent).trim()

    if (!content) {
      return {
        success: false,
        message: "O arquivo CSV está vazio.",
      }
    }

    const delimiter = detectDelimiter(content)
    const parsedRows = parseCsvRows(content, delimiter)

    if (parsedRows.length < 2) {
      return {
        success: false,
        message:
          "O CSV deve conter uma linha de cabeçalho e pelo menos um colaborador.",
      }
    }

    const headers = normalizeHeaders(parsedRows[0])

    if (headers.length < 2) {
      return {
        success: false,
        message:
          "Não foi possível identificar as colunas do CSV.",
      }
    }

    const rows: EmployeeImportPreviewRow[] = parsedRows
      .slice(1)
      .map((values, index) => ({
        rowNumber: index + 2,
        values: normalizeRowValues(values, headers.length),
      }))

    return {
      success: true,
      preview: {
        fileName: file.name,
        format: "csv",
        delimiter,
        headers,
        rows,
        totalRows: rows.length,
        previewLimit: PREVIEW_LIMIT,
      },
    }
  } catch (error) {
    console.error(
      "Erro ao processar CSV de colaboradores:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível processar o arquivo CSV.",
    }
  }
}
