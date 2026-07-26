import { z } from "zod"


const uuidSchema = z
  .string()
  .uuid("Identificador inválido.")


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



/**
 * DEPARTMENT
 */

const departmentCreateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("department.create"),

    payload:
      z.object({

        departmentId:
          uuidSchema,

        name:
          z.string()
            .trim()
            .min(2)
            .max(120),

        code:
          optionalNullableTextSchema,

        description:
          optionalNullableTextSchema,

        parentDepartmentId:
          uuidSchema
            .nullable()
            .optional()
            .transform(
              value => value ?? null
            ),
      }),
  })



const departmentUpdateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("department.update"),

    payload:
      z.object({

        departmentId:
          uuidSchema,

        name:
          z.string()
            .trim()
            .min(2)
            .max(120)
            .optional(),

        code:
          optionalNullableTextSchema,

        description:
          optionalNullableTextSchema,

        parentDepartmentId:
          uuidSchema
            .nullable()
            .optional()
            .transform(
              value => value ?? null
            ),
      }),
  })



const departmentArchiveSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("department.archive"),

    payload:
      z.object({

        departmentId:
          uuidSchema,

      }),
  })



/**
 * TEAM
 */

const teamCreateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("team.create"),

    payload:
      z.object({

        teamId:
          uuidSchema,

        name:
          z.string()
            .trim()
            .min(2)
            .max(120),

        code:
          optionalNullableTextSchema,

        description:
          optionalNullableTextSchema,

        departmentId:
          uuidSchema,

      }),
  })



const teamUpdateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("team.update"),

    payload:
      z.object({

        teamId:
          uuidSchema,

        name:
          z.string()
            .trim()
            .min(2)
            .max(120)
            .optional(),

        code:
          optionalNullableTextSchema,

        description:
          optionalNullableTextSchema,

        departmentId:
          uuidSchema
            .optional(),

      }),
  })



const teamArchiveSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("team.archive"),

    payload:
      z.object({

        teamId:
          uuidSchema,

      }),
  })



/**
 * POSITION
 */

const positionCreateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("position.create"),

    payload:
      z.object({

        positionId:
          uuidSchema,

        title:
          z.string()
            .trim()
            .min(2)
            .max(120),

        code:
          optionalNullableTextSchema,

        departmentId:
          uuidSchema,

        teamId:
          uuidSchema
            .nullable(),

        hierarchicalLevel:
          optionalNullableTextSchema,

        reportsToPositionId:
          uuidSchema
            .nullable(),

      }),
  })



const positionUpdateSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("position.update"),

    payload:
      z.object({

        positionId:
          uuidSchema,

        title:
          z.string()
            .trim()
            .min(2)
            .max(120)
            .optional(),

        code:
          optionalNullableTextSchema,

        departmentId:
          uuidSchema
            .optional(),

        teamId:
          uuidSchema
            .nullable()
            .optional(),

        hierarchicalLevel:
          optionalNullableTextSchema,

        reportsToPositionId:
          uuidSchema
            .nullable()
            .optional(),

      }),
  })



const positionMoveSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("position.move"),

    payload:
      z.object({

        positionId:
          uuidSchema,

        fromDepartmentId:
          uuidSchema,

        toDepartmentId:
          uuidSchema,

        fromTeamId:
          uuidSchema
            .nullable(),

        toTeamId:
          uuidSchema
            .nullable(),

      }),
  })



const positionArchiveSchema =
  z.object({

    scenarioId:
      uuidSchema,

    changeType:
      z.literal("position.archive"),

    payload:
      z.object({

        positionId:
          uuidSchema,

      }),
  })



/**
 * SCENARIO
 */

export const createScenarioActionInputSchema =
  z.object({

    workspaceId:
      uuidSchema,

    baseSnapshotId:
      uuidSchema,

    name:
      z.string()
        .trim()
        .min(2)
        .max(120),

    description:
      optionalNullableTextSchema,

  })



/**
 * CHANGE SET CREATE
 */

export const createPlanningChangeSetActionInputSchema =
  z.discriminatedUnion(
    "changeType",
    [

      departmentCreateSchema,
      departmentUpdateSchema,
      departmentArchiveSchema,

      teamCreateSchema,
      teamUpdateSchema,
      teamArchiveSchema,

      positionCreateSchema,
      positionUpdateSchema,
      positionMoveSchema,
      positionArchiveSchema,

    ]
  )



/**
 * CHANGE SET UPDATE
 */

const updateFields =
{
  changeSetId:
    uuidSchema,

  expectedVersion:
    z.number()
}



export const updatePlanningChangeSetActionInputSchema =
  z.discriminatedUnion(
    "changeType",
    [

      departmentCreateSchema.extend(updateFields),
      departmentUpdateSchema.extend(updateFields),
      departmentArchiveSchema.extend(updateFields),

      teamCreateSchema.extend(updateFields),
      teamUpdateSchema.extend(updateFields),
      teamArchiveSchema.extend(updateFields),

      positionCreateSchema.extend(updateFields),
      positionUpdateSchema.extend(updateFields),
      positionMoveSchema.extend(updateFields),
      positionArchiveSchema.extend(updateFields),

    ]
  )



export type CreateScenarioActionInput =
  z.infer<
    typeof createScenarioActionInputSchema
  >


export type CreatePlanningChangeSetActionInput =
  z.infer<
    typeof createPlanningChangeSetActionInputSchema
  >


export type UpdatePlanningChangeSetActionInput =
  z.infer<
    typeof updatePlanningChangeSetActionInputSchema
  >
