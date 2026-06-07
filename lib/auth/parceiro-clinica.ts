"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Resolve a clínica do parceiro logado (via profiles.clinica_id). null se não houver. */
export async function getClinicaIdDoParceiro(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinica_id")
    .eq("id", user.id)
    .maybeSingle();
  return (profile as { clinica_id?: string } | null)?.clinica_id ?? null;
}
