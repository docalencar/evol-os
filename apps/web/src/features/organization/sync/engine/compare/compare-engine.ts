import type {
  OrganizationSnapshot,
} from "../../types/organization-snapshot"

export type CompareEngineInput = {
  current: OrganizationSnapshot
  desired: OrganizationSnapshot
}

export function compareEngine({
  current,
  desired,
}: CompareEngineInput) {
  return {
    current,
    desired,
  }
}
