import assert from "node:assert/strict"
import test from "node:test"

import type { DevelopmentTemplateApplicationResolution } from "../resolver"
import { createSupabaseTrustedTemplateApplicationPersistence } from "./supabase-trusted-template-application-persistence"

const resolution = {
  fingerprint: "fingerprint-1",
  snapshot: {
    application: {
      companyId: "company-1",
    },
  },
} as unknown as DevelopmentTemplateApplicationResolution

test("trusted persistence conclui reserva adquirida", async () => {
  const database = new DatabaseMock([
    result({ status: "acquired", applicationId: "application-1", attemptId: "attempt-1" }),
    result({ status: "created", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1" }),
  ])
  const persistence = createSupabaseTrustedTemplateApplicationPersistence(database)

  assert.deepEqual(await persistence.persist(resolution), {
    status: "created",
    applicationId: "application-1",
    planId: "plan-1",
    snapshotId: "snapshot-1",
  })
  assert.deepEqual(database.names(), [
    "reserve_development_template_application_v1",
    "complete_development_template_application_v1",
  ])
})

test("trusted persistence devolve retry terminal sem completar novamente", async () => {
  const database = new DatabaseMock([
    result({ status: "idempotent_retry", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1" }),
  ])
  const persistence = createSupabaseTrustedTemplateApplicationPersistence(database)

  assert.equal((await persistence.persist(resolution)).status, "idempotent_retry")
  assert.deepEqual(database.names(), ["reserve_development_template_application_v1"])
})

test("trusted persistence registra falha determinística após rollback funcional", async () => {
  const database = new DatabaseMock([
    result({ status: "acquired", applicationId: "application-1", attemptId: "attempt-1" }),
    failure("DEVELOPMENT_TEMPLATE_MAPPING_CHANGED"),
    result({ status: "known_failure", applicationId: "application-1", failureCode: "DEVELOPMENT_TEMPLATE_MAPPING_CHANGED" }),
  ])
  const persistence = createSupabaseTrustedTemplateApplicationPersistence(database)

  assert.deepEqual(await persistence.persist(resolution), {
    status: "integrity_failure",
    code: "DEVELOPMENT_TEMPLATE_MAPPING_CHANGED",
  })
  assert.deepEqual(database.names(), [
    "reserve_development_template_application_v1",
    "complete_development_template_application_v1",
    "fail_development_template_application_v1",
  ])
})

test("trusted persistence preserva erro transitório para retry", async () => {
  const database = new DatabaseMock([
    result({ status: "acquired", applicationId: "application-1", attemptId: "attempt-1" }),
    failure("NETWORK_TIMEOUT"),
  ])
  const persistence = createSupabaseTrustedTemplateApplicationPersistence(database)

  assert.deepEqual(await persistence.persist(resolution), {
    status: "persistence_failure",
    code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED",
  })
  assert.deepEqual(database.names(), [
    "reserve_development_template_application_v1",
    "complete_development_template_application_v1",
  ])
})

test("trusted persistence falha fechado quando auditoria da falha não persiste", async () => {
  const database = new DatabaseMock([
    result({ status: "acquired", applicationId: "application-1", attemptId: "attempt-1" }),
    failure("DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED"),
    failure("AUDIT_WRITE_FAILED"),
  ])
  const persistence = createSupabaseTrustedTemplateApplicationPersistence(database)

  assert.deepEqual(await persistence.persist(resolution), {
    status: "persistence_failure",
    code: "DEVELOPMENT_TEMPLATE_FAILURE_AUDIT_FAILED",
  })
})

type RpcResponse = Readonly<{ data: unknown; error: unknown }>

function result(data: unknown): RpcResponse {
  return { data, error: null }
}

function failure(message: string): RpcResponse {
  return { data: null, error: { message } }
}

class DatabaseMock {
  private readonly calls: string[] = []

  constructor(private readonly responses: RpcResponse[]) {}

  rpc(name: string): Promise<RpcResponse> {
    this.calls.push(name)
    const response = this.responses.shift()
    assert.ok(response, `Resposta RPC ausente para ${name}`)
    return Promise.resolve(response)
  }

  names(): readonly string[] {
    return this.calls
  }
}
