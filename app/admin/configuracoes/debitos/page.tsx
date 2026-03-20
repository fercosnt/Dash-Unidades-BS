import { fetchDebitosAtivos } from "@/lib/debito-queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DebitosClient } from "./DebitosClient";

export default async function DebitosPage() {
  const supabase = await createSupabaseServerClient();
  const [debitos, clinicasRes] = await Promise.all([
    fetchDebitosAtivos(),
    supabase.from("clinicas_parceiras").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const clinicas = (clinicasRes.data ?? []) as { id: string; nome: string }[];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Saldo Devedor por Unidade</h2>
        <p className="mt-1 text-sm text-white/80">
          Gerencie débitos iniciais das clínicas parceiras (Franquia Fee e outros).
        </p>
      </div>
      <div className="rounded-xl bg-white shadow-md p-6">
        <DebitosClient debitos={debitos} clinicas={clinicas} />
      </div>
    </div>
  );
}
