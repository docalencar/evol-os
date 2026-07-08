"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="password">
            Senha
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Ainda não tem conta?{" "}
        <Link className="font-medium text-evol-blue" href="/signup">
          Criar conta
        </Link>
      </p>
    </>
  );
}
