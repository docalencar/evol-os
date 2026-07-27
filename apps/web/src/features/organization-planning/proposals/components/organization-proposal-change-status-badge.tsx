import {
  getProposalChangeStatusLabel,
} from "../constants/proposal-change-status"


type Status =
  | "suggested"
  | "modified"
  | "accepted"
  | "removed"


type Props = {
  status: Status
}


export function OrganizationProposalChangeStatusBadge({
  status,
}: Props) {


  const styles = {
    suggested:
      "border px-3 py-1 rounded-full text-xs",

    modified:
      "border px-3 py-1 rounded-full text-xs",

    accepted:
      "border px-3 py-1 rounded-full text-xs",

    removed:
      "border px-3 py-1 rounded-full text-xs",
  }


  const icons = {
    suggested: "⏳",
    modified: "✎",
    accepted: "✓",
    removed: "✕",
  }


  return (
    <span
      className={
        styles[status]
      }
    >
      {
        icons[status]
      }

      {" "}

      {
        getProposalChangeStatusLabel(
          status
        )
      }

    </span>
  )
}
