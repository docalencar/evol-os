"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NewPersonPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teamName, setTeamName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [discProfile, setDiscProfile] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Você precisa estar logado.");
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    const companyId = memberships?.[0]?.company_id;

    if (!companyId) {
      setErrorMessage("Nenhuma empresa encontrada.");
      setLoading(false);
      return;
    }

    let teamId = null;
    let positionId = null;

    if (teamName.trim()) {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({ company_id: companyId, name: teamName.trim() })
        .select("id")
        .single();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      teamId = team.id;
    }

    if (positionName.trim()) {
      const { data: position, error } = await supabase
        .from("positions")
        .insert({ company_id: companyId, name: positionName.trim() })
        .select("id")
        .single();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      positionId = position.id;
    }

    const { error } = await supabase.from("people").insert({
      company_id: companyId,
      full_name: fullName,
      email,
      phone,
      team_id: teamId,
      position_id: positionId,
      disc_profile: discProfile || null,
      hire_date: hireDate || null,
      status: "active",
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/app/people");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Adicionar pessoa</h2>
        <p className="mt-1 text-slate-600">Comece pelos dados essenciais.</p>
      </div>

      <Card>
        <h3 className="text-lg font-semibold">Dados básicos</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input required placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Estrutura</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input placeholder="Departamento" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <Input placeholder="Cargo" value={positionName} onChange={(e) => setPositionName(e.target.value)} />
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Desenvolvimento</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input placeholder="Perfil DISC: D, I, S ou C" maxLength={1} value={discProfile} onChange={(e) => setDiscProfile(e.target.value.toUpperCase())} />
          <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </div>
      </Card>

      {errorMessage ? (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/app/people")}>
          Cancelar
        </Button>

        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar pessoa"}
        </Button>
      </div>
    </form>
  );
}
