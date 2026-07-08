import { createDepartmentRepository } from "../repositories/department-repository";

export async function getDepartmentById(
  companyId: string,
  departmentId: string
) {
  const departmentRepository = await createDepartmentRepository();

  const { data, error } = await departmentRepository.findById(
    companyId,
    departmentId
  );

  if (error) {
    throw new Error("Erro ao buscar departamento.");
  }

  return data;
}