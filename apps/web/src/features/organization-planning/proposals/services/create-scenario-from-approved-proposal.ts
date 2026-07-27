import { randomUUID } from "crypto"

import {
  PlanningScenario,
} from "@/features/organization-planning/domain/planning-scenario"

import {
  PublishedSnapshot,
} from "@/features/organization-planning/domain/published-snapshot"

import {
  createWorkspaceRepository,
} from "@/features/organization-planning/repositories/workspace-repository"

import {
  createSnapshotRepository,
} from "@/features/organization-planning/repositories/snapshot-repository"

import {
  createScenarioRepository,
} from "@/features/organization-planning/repositories/scenario-repository"


type Input = {
  companyId: string

  proposal: {
    id: string
    title: string
    description: string | null
  }
}


export async function createScenarioFromApprovedProposal(
  input: Input
) {

  const workspaceRepository =
    await createWorkspaceRepository()


  const snapshotRepository =
    await createSnapshotRepository()


  const scenarioRepository =
    await createScenarioRepository()



  const workspaces =
    await workspaceRepository.findAllByCompany(
      input.companyId
    )


  const workspace =
    workspaces[0]


  if (!workspace) {
    throw new Error(
      "COMPANY_HAS_NO_PLANNING_WORKSPACE"
    )
  }



  const snapshots =
    await snapshotRepository.findAllByCompany(
      input.companyId
    )


  const baseSnapshot =
    snapshots[0]


  if (!baseSnapshot) {
    throw new Error(
      "COMPANY_HAS_NO_PUBLISHED_SNAPSHOT"
    )
  }



  const scenario =
    PlanningScenario.create({

      id:
        randomUUID(),

      companyId:
        input.companyId,

      workspaceId:
        workspace.id,

      baseSnapshotId:
        baseSnapshot.id,

      name:
        input.proposal.title,

      description:
        input.proposal.description,

      createdAt:
        new Date(),

    })


  await scenarioRepository.create(
    scenario
  )



  const snapshot =
    PublishedSnapshot.publish({

      id:
        randomUUID(),

      companyId:
        input.companyId,

      workspaceId:
        workspace.id,

      sourceScenarioId:
        scenario.id,

      version:
        baseSnapshot.version + 1,

      publishedAt:
        new Date(),

    })


  await snapshotRepository.create(
    snapshot
  )


  return {
    scenario,
    snapshot,
  }

}