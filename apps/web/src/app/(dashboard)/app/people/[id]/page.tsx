import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: person, error } = await supabase
    .from("people")
    .select(`
      id,
      full_name,
      email,
      phone,
      status,
      disc_profile,
      hire_date,
      teams(name),
      positions(name)
    `)
    .eq("id", id)
    .single();

  if (error || !person) {
    redirect("/app/people");
  }

  const initials = person.full_name
    .split(" ")
    .map((name: string) => name.charAt(0))
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-6">
      <Link href="/app/people">
        <Button variant="secondary">Voltar</Button>
      </Link>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {initials}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {person.full_name}
            </h2>

            <p className="text-slate-600">
              {getRelationName(person.positions)} · {getRelationName(person.teams)}
            </p>

            <div className="mt-2">
              <Badge>{getStatusLabel(person.status)}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Email</p>
          <p className="mt-2 font-semibold">{person.email || "-"}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Telefone</p>
          <p className="mt-2 font-semibold">{person.phone || "-"}</p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">DISC</p>
          <p className="mt-2 font-semibold">{person.disc_profile || "-"}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold">Timeline</h3>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>✅ Pessoa cadastrada na Evol</p>
          <p>⏳ Avaliações serão adicionadas em breve</p>
          <p>⏳ Feedbacks serão adicionados em breve</p>
          <p>⏳ PDI será adicionado em breve</p>
        </div>
      </Card>
    </div>
  );
}
