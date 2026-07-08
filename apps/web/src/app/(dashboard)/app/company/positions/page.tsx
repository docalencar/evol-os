import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PositionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cargos</h2>
          <p className="mt-1 text-slate-600">Defina os cargos utilizados na empresa.</p>
        </div>
        <Button>Novo cargo</Button>
      </div>

      <Input placeholder="Buscar cargo..." />

      <Card>
        <p className="font-semibold">Gerente de Operações</p>
        <p className="text-sm text-slate-600">Responsável pela operação geral</p>
      </Card>
    </div>
  );
}
