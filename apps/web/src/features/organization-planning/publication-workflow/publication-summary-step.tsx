export function PublicationSummaryStep({ name, version }: { name: string; version: number }) {
  return <dl className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="text-xs uppercase text-slate-400">Cenário</dt><dd className="font-medium text-slate-900">{name}</dd></div><div><dt className="text-xs uppercase text-slate-400">Versão esperada</dt><dd className="font-medium text-slate-900">{version}</dd></div></dl>
}
