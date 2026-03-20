import { fetchDentistas } from "@/lib/dentista-queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DentistasClient } from "./DentistasClient";

export default async function DentistasPage() {
  const supabase = await createSupabaseServerClient();
  const [dentistas, clinicasRes] = await Promise.all([
    fetchDentistas(),
    supabase.from("clinicas_parceiras").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const clinicas = (clinicasRes.data ?? []) as { id: string; nome: string }[];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Dentistas</h2>
        <p className="mt-1 text-sm text-white/80">
          Gerencie as dentistas vinculadas a cada clínica parceira. Cada clínica pode ter no máximo 1 dentista ativa.
        </p>
      </div>
      <DentistasClient dentistas={dentistas} clinicas={clinicas} />
    </div>
  );
}
