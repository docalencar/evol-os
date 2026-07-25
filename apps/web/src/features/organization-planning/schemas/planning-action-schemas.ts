import { z } from "zod"

const optionalNullableTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null
    }

    return value
  })

const departmentCreateSchema = z.object({
  scenarioId: z
    .string()
    .uuid("Cenário inválido."),

  changeType: z.literal("department.create"),

  payload: z.object({
    departmentId: z
      .string()
      .uuid("Departamento inválido."),

    name: z
      .string()
      .trim()
      .min(
        2,
        "O nome do departamento deve ter pelo menos 2 caracteres."
      )
      .max(
        120,
        "O nome do departamento deve ter no máximo 120 caracteres."
      ),

    code: optionalNullableTextSchema.pipe(
      z
        .string()
        .max(
          50,
          "O código deve ter no máximo 50 caracteres."
        )
        .nullable()
    ),

    description: optionalNullableTextSchema.pipe(
      z
        .string()
        .max(
          500,
          "A descrição deve ter no máximo 500 caracteres."
        )
        .nullable()
    ),

    parentDepartmentId: z
      .union([
        z
          .string()
          .uuid("Departamento superior inválido."),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),
  }),
})

const departmentUpdateSchema = z.object({
  scenarioId: z
    .string()
    .uuid("Cenário inválido."),

  changeType: z.literal("department.update"),

  payload: z.object({
    departmentId: z
      .string()
      .uuid("Departamento inválido."),

    name: z
      .string()
      .trim()
      .min(
        2,
        "O nome do departamento deve ter pelo menos 2 caracteres."
      )
      .max(
        120,
        "O nome do departamento deve ter no máximo 120 caracteres."
      )
      .optional(),

    code: optionalNullableTextSchema.pipe(
      z
        .string()
        .max(
          50,
          "O código deve ter no máximo 50 caracteres."
        )
        .nullable()
    ),

    description: optionalNullableTextSchema.pipe(
      z
        .string()
        .max(
          500,
          "A descrição deve ter no máximo 500 caracteres."
        )
        .nullable()
    ),

    parentDepartmentId: z
      .union([
        z
          .string()
          .uuid("Departamento superior inválido."),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),
  }),
})

const departmentArchiveSchema = z.object({
  scenarioId: z
    .string()
    .uuid("Cenário inválido."),

  changeType: z.literal("department.archive"),

  payload: z.object({
    departmentId: z
      .string()
      .uuid("Departamento inválido."),
  }),
})

export const createScenarioActionInputSchema =
  z.object({
    workspaceId: z
      .string()
      .uuid("Workspace inválido."),

    baseSnapshotId: z
      .string()
      .uuid("Snapshot-base inválido."),

    name: z
      .string()
      .trim()
      .min(
        2,
        "O nome do cenário deve ter pelo menos 2 caracteres."
      )
      .max(
        120,
        "O nome do cenário deve ter no máximo 120 caracteres."
      ),

    description: z
      .string()
      .trim()
      .max(
        500,
        "A descrição deve ter no máximo 500 caracteres."
      )
      .optional()
      .nullable(),
  })

export const createPlanningChangeSetActionInputSchema =
  z.discriminatedUnion("changeType", [
    departmentCreateSchema,
    departmentUpdateSchema,
    departmentArchiveSchema,
  ])

export type CreateScenarioActionInput =
  z.infer<
    typeof createScenarioActionInputSchema
  >

export type CreatePlanningChangeSetActionInput =
  z.infer<
    typeof createPlanningChangeSetActionInputSchema
  >
