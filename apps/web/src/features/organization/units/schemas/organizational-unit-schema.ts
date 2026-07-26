import { z } from "zod"


export const organizationalUnitSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Informe um nome válido."
      ),

    parentId:
      z
        .string()
        .uuid()
        .nullable(),

    type: z.enum([
      "holding",
      "business_unit",
    ]),

    status: z.enum([
      "active",
      "inactive",
    ]),
  })


export type OrganizationalUnitInput =
  z.infer<
    typeof organizationalUnitSchema
  >