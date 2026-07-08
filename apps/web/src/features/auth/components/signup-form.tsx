"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/app");
      router.refresh();
      return;
    }

    setMessage("Conta criada. Verifique seu email para confirmar o cadastro.");
    setLoading(false);
  }

  return (
    <>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium" htmlFor="name">
            Nome
          </label>
          <Input
            id="name"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
          />
        </div>
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
            placeholder="Crie uma senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link className="font-medium text-evol-blue" href="/login">
          Entrar
        </Link>
      </p>
    </>
  );
}
