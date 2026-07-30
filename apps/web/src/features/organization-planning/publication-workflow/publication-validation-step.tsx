import type { PublicationValidationResult } from "../application"

export function PublicationValidationStep({ status, validation }: { status: string; validation: PublicationValidationResult | null }) {
  if (!validation) return <p className="text-sm text-slate-600">Executando preflight da publicação…</p>
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Status atual: <strong>{status}</strong>. Somente cenários aprovados podem ser publicados.
      </p>
      {validation.errors.length > 0 ? <IssueList title="Impedimentos" issues={validation.errors} className="text-red-700" /> : <p className="text-sm font-medium text-green-700">Todas as validações bloqueantes foram aprovadas.</p>}
      {validation.warnings.length > 0 ? <IssueList title="Avisos" issues={validation.warnings} className="text-amber-700" /> : null}
    </div>
  )
}

function IssueList({ title, issues, className }: { title: string; issues: readonly { code: string; message: string }[]; className: string }) {
  return <div><h3 className={`text-sm font-semibold ${className}`}>{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{issues.map((issue) => <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>)}</ul></div>
}
