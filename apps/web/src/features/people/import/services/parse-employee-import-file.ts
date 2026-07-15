import {
  parseEmployeeImportXlsx,
} from "../parsers/parse-employee-import-xlsx"
import type {
  EmployeeImportParseResult,
} from "../types/employee-import-preview"
import {
  parseEmployeeImportCsv,
} from "./parse-employee-import-csv"

function getFileExtension(fileName: string) {
  return fileName
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase() ?? ""
}

export async function parseEmployeeImportFile(
  file: File
): Promise<EmployeeImportParseResult> {
  const extension = getFileExtension(file.name)

  switch (extension) {
    case "csv":
      return parseEmployeeImportCsv(file)

    case "xlsx":
      return parseEmployeeImportXlsx(file)

    default:
      return {
        success: false,
        message:
          "Formato não suportado. Selecione um arquivo CSV ou XLSX.",
      }
  }
}
