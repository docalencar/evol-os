import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/supabase/server";

type Relation = { name: string } | { name: string }[] | null;

function getRelationName(relation: Relation) {
  if (!relation) return "-";
  if (Array.isArray(relation)) return relation[0]?.name || "-";
  return relation.name || "-";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    on_leave: "Afastado",
    terminated: "Desligado",
  };

  return labels[status] || status;
}

export default async function PeoplePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const companyId = memberships?.[0]?.company_id;

  if (!companyId) redirect("/onboarding");

  const { data: people, error } = await supabase
    .from("people")
    .select(`
      id,
      full_name,
      email,
      status,
      disc_profile,
      teams(name),
      positions(name)
    `)
    .eq("company_id", companyId)
    .order("full_name");

  if (error) throw new Error(error.message);

  const totalPeople = people?.length ?? 0;
  const activePeople = people?.filter((person) => person.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Pessoas</h2>
          <p className="mt-1 text-slate-600">
            Organize colaboradores, cargos, departamentos e gestores.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/app/people/import">
            <Button variant="secondary">Importar planilha</Button>
          </Link>

          <Link href="/app/people/new">
            <Button>Adicionar pessoa</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total de pessoas</p>
          <p className="mt-2 text-3xl font-bold">{totalPeople}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Ativos</p>
          <p className="mt-2 text-3xl font-bold">{activePeople}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Próximo passo</p>
          <p className="mt-2 font-semibold">Definir gestores</p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Pesquisar por nome..." />
        <Input placeholder="Departamento" />
        <Input placeholder="Cargo" />
        <Input placeholder="Status" />
      </div>

      <div className="grid gap-4">
        {people && people.length > 0 ? (
          people.map((person) => (
            <Link key={person.id} href={`/app/people/${person.id}`}>
              <Card className="transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                      {person.full_name
                        .split(" ")
                        .map((name:string) => name.charAt(0))}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {person.full_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {person.email || "Sem email"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden text-sm text-slate-600 md:block">
                    {getRelationName(person.teams)}
                  </div>

                  <div className="hidden text-sm text-slate-600 md:block">
                    {getRelationName(person.positions)}
                  </div>

                  <div className="hidden text-sm text-slate-600 md:block">
                    DISC: {person.disc_profile || "-"}
                  </div>

                  <Badge>{getStatusLabel(person.status)}</Badge>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <div className="py-10 text-center">
              <p className="font-semibold text-slate-900">
                Nenhuma pessoa cadastrada ainda.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Comece adicionando o primeiro colaborador.
              </p>

              <Link href="/app/people/new">
                <Button className="mt-4">Adicionar pessoa</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}