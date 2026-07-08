"use server";

import { revalidatePath } from "next/cache";

import { createDepartmentRepository } from "../repositories/department-repository";
import { createDepartmentSchema } from "../schemas/department-schema";

type CreateDepartmentActionState = {
  success: boolean;
  message: string;
};

export async function createDepartmentAction(
  companyId: string,
  input: unknown
): Promise<CreateDepartmentActionState> {
  const parsedInput = createDepartmentSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar departamento.",
    };
  }

  const departmentRepository = await createDepartmentRepository();

  const { error } = await departmentRepository.create({
    companyId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    leaderId: parsedInput.data.leaderId || null,
  });

  if (error) {
  console.error("Erro Supabase createDepartment:", error);

  return {
    success: false,
    message: error.message,
  };

  }

  revalidatePath("/app/company");

  return {
    success: true,
    message: "Departamento criado com sucesso.",
  };
}