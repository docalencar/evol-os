import { requireVersion } from "../domain/planning-domain-support"

export function incrementVersion(version: number) {
  return requireVersion(version) + 1
}
