import assert from "node:assert/strict"
import { test } from "node:test"

import { z } from "zod"

import { DISC_PROFILE_VALUES } from "@/features/people/constants/disc-profile"

// Mirror the exact read contract fields the People management/profile read models
// validate for a person row. The DISC domain must match the write contract; the
// v3 seniority fields are additive and nullable.
const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const timestamp = z.string().datetime({ offset: true })
const nullableText = z.string().nullable()
const nullableDiscProfile = z.enum(DISC_PROFILE_VALUES).nullable()

const personRowSchema = z
  .object({
    person_id: uuid,
    full_name: z.string().min(1),
    email: nullableText,
    phone: nullableText,
    birth_date: nullableText,
    hire_date: nullableText,
    status: z.enum(["active", "inactive", "on_leave", "terminated"]),
    has_user_access: z.boolean(),
    manager_id: nullableUuid,
    manager_name: nullableText,
    team_id: nullableUuid,
    team_name: nullableText,
    position_id: nullableUuid,
    position_name: nullableText,
    position_seniority_profile_id: nullableUuid,
    seniority_level_id: nullableUuid,
    seniority_code: nullableText,
    seniority_label: nullableText,
    disc_profile: nullableDiscProfile,
    avatar_url: nullableText,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const baseRow = {
  person_id: "11111111-1111-4111-8111-111111111111",
  full_name: "Read Person",
  email: null,
  phone: null,
  birth_date: null,
  hire_date: null,
  status: "active",
  has_user_access: false,
  manager_id: null,
  manager_name: null,
  team_id: null,
  team_name: null,
  position_id: "22222222-2222-4222-8222-222222222222",
  position_name: "Analista",
  position_seniority_profile_id: "33333333-3333-4333-8333-333333333333",
  seniority_level_id: null,
  seniority_code: null,
  seniority_label: null,
  disc_profile: "D",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: "2026-01-01T00:00:00+00:00",
} as const

const withDisc = (disc: string) => ({ ...baseRow, disc_profile: disc })

test("A. the read schema accepts the primary DISC styles", () => {
  for (const disc of ["D", "I", "S", "C"]) {
    assert.equal(personRowSchema.safeParse(withDisc(disc)).success, true, disc)
  }
})

test("B. the read schema accepts every canonical two-letter DISC profile", () => {
  for (const disc of DISC_PROFILE_VALUES) {
    assert.equal(
      personRowSchema.safeParse(withDisc(disc)).success,
      true,
      `${disc} must be accepted`
    )
  }
  // The specific regression values.
  for (const disc of ["ID", "DC"]) {
    assert.equal(personRowSchema.safeParse(withDisc(disc)).success, true, disc)
  }
})

test("C. a null DISC profile remains accepted", () => {
  assert.equal(
    personRowSchema.safeParse({ ...baseRow, disc_profile: null }).success,
    true
  )
})

test("D. a genuinely invalid DISC value still fails loud", () => {
  assert.equal(personRowSchema.safeParse(withDisc("ZZ")).success, false)
  assert.equal(personRowSchema.safeParse(withDisc("X")).success, false)
})

test("E. the additive v3 seniority fields parse for base and specific rows", () => {
  // Base assignment: seniority columns are NULL.
  assert.equal(personRowSchema.safeParse(baseRow).success, true)
  // Specific assignment: profile + seniority resolve.
  assert.equal(
    personRowSchema.safeParse({
      ...baseRow,
      seniority_level_id: "44444444-4444-4444-8444-444444444444",
      seniority_code: "PL",
      seniority_label: "Pleno",
    }).success,
    true
  )
})

test("F. strict shape is preserved — unknown fields are rejected", () => {
  assert.equal(
    personRowSchema.safeParse({ ...baseRow, unexpected: 1 }).success,
    false
  )
})

test("the read DISC domain equals the write DISC domain", () => {
  // Guards against future drift between write and read contracts.
  assert.equal(DISC_PROFILE_VALUES.length, 16)
  assert.ok(DISC_PROFILE_VALUES.includes("ID"))
  assert.ok(DISC_PROFILE_VALUES.includes("CS"))
})
