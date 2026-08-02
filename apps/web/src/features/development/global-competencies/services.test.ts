import assert from "node:assert/strict"
import test from "node:test"
import { executeGlobalCatalogOperation, executeTenantMappingOperation } from "./services"
import type { GlobalCompetencyRepository, TenantMappingRepository } from "./contracts"

test("global catalog preserves authenticated human actor",async()=>{let actor="";const repository:GlobalCompetencyRepository={async listPublished(){return[]},async execute(value){actor=value;return"id"}};assert.equal(await executeGlobalCatalogOperation(repository,{actorUserId:"human",operation:"create_concept",payload:{code:"leadership"},reason:"create_concept"}),"id");assert.equal(actor,"human")})
test("AI and technical principals cannot confirm mappings",async()=>{const repository:TenantMappingRepository={async list(){return[]},async execute(){return"unexpected"}};for(const actorType of ["ai","technical"] as const){await assert.rejects(executeTenantMappingOperation(repository,{companyId:"company",conceptVersionId:"version",competencyId:"competency",operation:"confirm",reason:"confirm_mapping",actorType}),/HUMAN_CONFIRMATION_REQUIRED/)}})
test("mapping operation requires structured reason",async()=>{const repository:TenantMappingRepository={async list(){return[]},async execute(){return"id"}};await assert.rejects(executeTenantMappingOperation(repository,{companyId:"company",conceptVersionId:"version",competencyId:"competency",operation:"propose",reason:" ",actorType:"human"}),/REASON_REQUIRED/)})
