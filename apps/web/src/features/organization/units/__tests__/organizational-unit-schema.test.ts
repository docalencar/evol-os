import { test } from "node:test"
import assert from "node:assert/strict"

import {
  organizationalUnitSchema,
} from "../schemas/organizational-unit-schema"


test(
  "aceita uma unidade organizacional válida",
  () => {
    const result =
      organizationalUnitSchema.safeParse({
        name: "Parrileiro Sul",
        parentId: null,
        type: "business_unit",
        status: "active",
      })

    assert.equal(
      result.success,
      true
    )
  }
)


test(
  "rejeita nome vazio",
  () => {
    const result =
      organizationalUnitSchema.safeParse({
        name: "",
        parentId: null,
        type: "business_unit",
        status: "active",
      })

    assert.equal(
      result.success,
      false
    )
  }
)


test(
  "aceita holding como tipo organizacional",
  () => {
    const result =
      organizationalUnitSchema.safeParse({
        name: "Evol Holding",
        parentId: null,
        type: "holding",
        status: "active",
      })

    assert.equal(
      result.success,
      true
    )
  }
)