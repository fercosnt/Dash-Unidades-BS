import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas admin." }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const { data: resumos, error } = await admin
      .from("resumo_mensal")
      .select("clinica_id, mes_referencia");

    if (error || !resumos?.length) {
      return NextResponse.json(
        { error: "Nenhum resumo encontrado para recalcular." },
        { status: 404 }
      );
    }

    const pares = resumos.map((r) => ({
      clinicaId: r.clinica_id as string,
      mes: (r.mes_referencia as string).slice(0, 7),
    }));

    // Deduplica (pode ter formatos diferentes de data)
    const uniqueKey = (p: { clinicaId: string; mes: string }) => `${p.clinicaId}|${p.mes}`;
    const seen = new Set<string>();
    const unicos = pares.filter((p) => {
      const k = uniqueKey(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const resultados: { clinicaId: string; mes: string; ok: boolean; error?: string }[] = [];

    for (const { clinicaId, mes } of unicos) {
      const result = await calcularEPersistirResumo(clinicaId, mes);
      resultados.push({
        clinicaId,
        mes,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
      });
    }

    const sucesso = resultados.filter((r) => r.ok).length;
    const falhas = resultados.filter((r) => !r.ok);

    return NextResponse.json({
      message: `Recalculados ${sucesso}/${unicos.length} resumos.`,
      total: unicos.length,
      sucesso,
      falhas,
    });
  } catch (err) {
    console.error("[api/resumo/recalcular-todos] Erro interno ao recalcular todos os resumos:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
