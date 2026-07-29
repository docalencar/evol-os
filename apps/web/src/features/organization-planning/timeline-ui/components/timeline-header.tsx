import { GitBranch } from "lucide-react"

type TimelineHeaderProps = {
  workspaceId: string
}

export function TimelineHeader({ workspaceId }: TimelineHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">Organization Planning</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900">
          <GitBranch aria-hidden="true" className="size-7 text-slate-500" />
          Timeline de cenários
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Acompanhe a evolução cronológica dos cenários deste workspace.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          Workspace
        </span>
        <span className="mt-1 block max-w-60 truncate font-medium text-slate-700" title={workspaceId}>
          {workspaceId}
        </span>
      </div>
    </header>
  )
}
