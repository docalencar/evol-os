import {
  BriefcaseBusiness,
  Building2,
  CircleDot,
  UserRound,
  Users,
} from "lucide-react"

import type {
  ChangeSetEntity,
} from "./change-set-description"

type ChangeSetIconProps = Readonly<{
  entity: ChangeSetEntity
  className?: string
  size?: number
}>

const DEFAULT_ICON_SIZE = 18

export function ChangeSetIcon({
  entity,
  className,
  size = DEFAULT_ICON_SIZE,
}: ChangeSetIconProps) {
  switch (entity) {
    case "department":
      return (
        <Building2
          aria-hidden="true"
          className={className}
          size={size}
          strokeWidth={1.8}
        />
      )

    case "team":
      return (
        <Users
          aria-hidden="true"
          className={className}
          size={size}
          strokeWidth={1.8}
        />
      )

    case "position":
      return (
        <BriefcaseBusiness
          aria-hidden="true"
          className={className}
          size={size}
          strokeWidth={1.8}
        />
      )

    case "employee":
      return (
        <UserRound
          aria-hidden="true"
          className={className}
          size={size}
          strokeWidth={1.8}
        />
      )

    default:
      return (
        <CircleDot
          aria-hidden="true"
          className={className}
          size={size}
          strokeWidth={1.8}
        />
      )
  }
}
