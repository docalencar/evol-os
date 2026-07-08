import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ImportPeoplePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Importar planilha</h2>
        <p className="mt-1 text-slate-600">Use uma planilha simples com nome, email, cargo e departamento.</p>
      </div>

      <Card className="border-dashed text-center">
        <p className="text-lg font-semibold">Arraste a planilha aqui</p>
        <p className="mt-2 text-sm text-slate-600">Arquivos aceitos: CSV ou XLSX</p>
        <Button className="mt-4">Selecionar arquivo</Button>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Modelo esperado</h3>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Cargo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-3">Maria Oliveira</td>
                <td className="px-4 py-3">maria@empresa.com</td>
                <td className="px-4 py-3">Recepção</td>
                <td className="px-4 py-3">Recepcionista</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
