"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : signInError.message);
      return;
    }

    // Redirecionamento com reload completo para o servidor usar a nova sessão (evita cache com usuário anterior)
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#0A2463] mb-1">
          Beauty Smile Partners
        </h1>
        <p className="text-slate-600 text-sm mb-6">Entre com seu e-mail e senha.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#0A2463] focus:outline-none focus:ring-1 focus:ring-[#0A2463]"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#0A2463] focus:outline-none focus:ring-1 focus:ring-[#0A2463]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#0A2463] px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
