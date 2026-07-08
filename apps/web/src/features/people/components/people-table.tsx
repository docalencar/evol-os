import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const samplePeople = [
  {
    id: "1",
    name: "Carlos Menezes",
    position: "Gerente de Operações",
    team: "Recepção",
    manager: "Diretoria",
    status: "Ativo"
  },
  {
    id: "2",
    name: "Ana Bezerra",
    position: "Recepcionista",
    team: "Recepção",
    manager: "Carlos Menezes",
    status: "Ativo"
  }
];

export function PeopleTable() {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Cargo</th>
            <th className="px-4 py-3">Departamento</th>
            <th className="px-4 py-3">Gestor</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {samplePeople.map((person) => (
            <tr key={person.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">
                <Link href={`/app/people/${person.id}`}>{person.name}</Link>
              </td>
              <td className="px-4 py-3">{person.position}</td>
              <td className="px-4 py-3">{person.team}</td>
              <td className="px-4 py-3">{person.manager}</td>
              <td className="px-4 py-3"><Badge>{person.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
