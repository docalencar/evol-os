import type { PublicationValidationResult } from "../application"

export function PublicationImpactStep({ validation }: { validation: PublicationValidationResult }) {
  return <div className="space-y-3 text-sm text-slate-600"><p>A projeção foi executada novamente sobre o baseline e os Change Sets canônicos.</p><p><strong>{validation.warnings.length}</strong> aviso(s) não bloqueante(s) identificado(s).</p><p>A organização projetada será persistida integralmente no novo Snapshot.</p></div>
}
