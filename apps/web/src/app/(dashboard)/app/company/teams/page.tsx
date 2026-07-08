import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Departamentos</h2>
          <p className="mt-1 text-slate-600">Crie a estrutura da empresa.</p>
        </div>
        <Button>Novo departamento</Button>
      </div>

      <Input placeholder="Buscar departamento..." />

      <Card>
        <p className="font-semibold">Recepção</p>
        <p className="text-sm text-slate-600">Equipe de atendimento ao cliente</p>
      </Card>
    </div>
  );
}
