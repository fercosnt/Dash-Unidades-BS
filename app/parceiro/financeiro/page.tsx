import {
  getResumoMes,
  getHistoricoResumos,
  getMesesComResumo,
} from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchContaCorrente, type ContaCorrente } from "@/lib/saldo-parceiro-queries";
import { FinanceiroParceiroClient } from "./FinanceiroParceiroClient";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getClinicaIdDoParceiro(): Promise<string | null> {
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

export default async function ParceiroFinanceiroPage() {
  const meses = await getMesesComResumo();
  const mesRef = meses[0] ?? currentMonth();

  const clinicaId = await getClinicaIdDoParceiro();
  const [resumo, historico, conta] = await Promise.all([
    getResumoMes(mesRef),
    getHistoricoResumos(12),
    clinicaId ? fetchContaCorrente(clinicaId) : Promise.resolve<ContaCorrente | null>(null),
  ]);

  const mesesList = meses.length > 0 ? meses : [currentMonth()];

  return (
    <FinanceiroParceiroClient
      meses={mesesList}
      initialMes={mesRef}
      initialResumo={resumo}
      historico={historico}
      conta={conta}
    />
  );
}
