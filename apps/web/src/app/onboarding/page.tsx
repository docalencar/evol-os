import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/supabase/server";

export default async function AppHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-slate-900">
          O que precisa de atenção hoje?
        </h2>

        <p className="mt-1 text-slate-600">
          Comece pelas ações que mais ajudam sua equipe a evoluir.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Pessoas cadastradas</p>
          <p className="mt-2 text-3xl font-bold">0</p>
          <p className="mt-2 text-sm text-slate-600">
            Adicione sua primeira pessoa para começar.
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Gestores definidos</p>
          <p className="mt-2 text-3xl font-bold">0</p>
          <p className="mt-2 text-sm text-slate-600">
            O organograma será gerado automaticamente.
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Próximo passo</p>
          <p className="mt-2 text-lg font-semibold">Organizar pessoas</p>

          <Link href="/app/people/new">
            <Button className="mt-4">Adicionar pessoa</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}