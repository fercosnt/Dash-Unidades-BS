"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DentistaItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
};

export async function fetchDentistas(): Promise<DentistaItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("dentistas")
    .select("id, clinica_id, nome, email, telefone, ativo, clinicas_parceiras(nome)")
    .order("ativo", { ascending: false })
    .order("nome");

  type Row = {
    id: string;
    clinica_id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      nome: r.nome,
      email: r.email,
      telefone: r.telefone,
      ativo: r.ativo,
    };
  });
}
