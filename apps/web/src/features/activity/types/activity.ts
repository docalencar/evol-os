export const ACTIVITY_ACTOR_TYPES = [
  "user",
  "system",
  "automation",
  "integration",
] as const

export const ACTIVITY_VISIBILITIES = [
  "company",
  "restricted",
] as const

export type ActivityActorType =
  (typeof ACTIVITY_ACTOR_TYPES)[number]

export type ActivityVisibility =
  (typeof ACTIVITY_VISIBILITIES)[number]

export type ActivityMetadataValue =
  | string
  | number
  | boolean
  | null
  | ActivityMetadataValue[]
  | {
      [key: string]: ActivityMetadataValue
    }

export type ActivityMetadata = {
  [key: string]: ActivityMetadataValue
}

export type Activity = {
  id: string
  companyId: string
  activityType: string
  module: string
  title: string
  description: string | null
  actorType: ActivityActorType
  actorId: string | null
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  visibility: ActivityVisibility
  metadata: ActivityMetadata
  occurredAt: Date
  createdAt: Date
}
