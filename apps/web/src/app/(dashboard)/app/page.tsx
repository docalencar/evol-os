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
  const [positionName, setPositionName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [discProfile, setDiscProfile] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setErrorMessage("Você precisa estar logado.");
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1);

    const companyId = memberships?.[0]?.company_id;

    if (!companyId) {
      setErrorMessage("Nenhuma empresa encontrada.");
      setLoading(false);
      return;
    }

    let teamId: string | null = null;
    let positionId: string | null = null;

    if (teamName.trim()) {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          company_id: companyId,
          name: teamName.trim(),
        })
        .select("id")
        .single();

      if (teamError) {
        setErrorMessage(teamError.message);
        setLoading(false);
        return;
      }

      teamId = team.id;
    }

    if (positionName.trim()) {
      const { data: position, error: positionError } = await supabase
        .from("positions")
        .insert({
          company_id: companyId,
          name: positionName.trim(),
        })
        .select("id")
        .single();

      if (positionError) {
        setErrorMessage(positionError.message);
        setLoading(false);
        return;
      }

      positionId = position.id;
    }

    const { error: personError } = await supabase.from("people").insert({
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

    if (personError) {
      setErrorMessage(personError.message);
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
        <p className="mt-1 text-slate-600">
          Comece pelos dados essenciais.
        </p>
      </div>

      <Card>
        <h3 className="text-lg font-semibold">1. Dados básicos</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ex.: Maria Oliveira"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="maria@empresa.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Telefone</label>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(85) 99999-9999"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">2. Estrutura</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Departamento</label>
            <Input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Recepção"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Cargo</label>
            <Input
              value={positionName}
              onChange={(event) => setPositionName(event.target.value)}
              placeholder="Recepcionista"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">3. Desenvolvimento</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Perfil DISC</label>
            <Input
              value={discProfile}
              onChange={(event) => setDiscProfile(event.target.value.toUpperCase())}
              placeholder="D, I, S ou C"
              maxLength={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data de admissão</label>
            <Input
              type="date"
              value={hireDate}
              onChange={(event) => setHireDate(event.target.value)}
            />
          </div>
        </div>
      </Card>

      {errorMessage ? (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
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