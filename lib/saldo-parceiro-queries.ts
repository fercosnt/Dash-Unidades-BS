"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { montarContaCorrente, type ContaCorrente as ContaCorrenteBase } from "@/lib/conta-corrente";

export type ContaCorrente = ContaCorrenteBase;

export type SaldoParceiro = { clinicaId: string; nome: string; saldo: number };

/** Saldo da conta corrente de cada clínica ativa (p/ a lista do dashboard admin). */
export async function fetchSaldosParceiros(): Promise<SaldoParceiro[]> {
  const supabase = await createSupabaseServerClient();
  const { data: clinicas } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  const rows = (clinicas ?? []) as { id: string; nome: string }[];
  return Promise.all(
    rows.map(async (c) => {
      const conta = await fetchContaCorrente(c.id);
      return { clinicaId: c.id, nome: c.nome, saldo: conta.saldo };
    })
  );
}

export async function fetchContaCorrente(clinicaId: string): Promise<ContaCorrente> {
  return montarContaCorrente(await createSupabaseServerClient(), clinicaId);
}
