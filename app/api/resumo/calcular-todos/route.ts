import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";

const MAX_PAIRS = 50;
const MAX_MS = 50_000;

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const { data: rows } = await supabase
      .from("orcamentos_fechados")
      .select("clinica_id, mes_referencia");

    const seen = new Set<string>();
    const pairs: { clinicaId: string; mesRef: string }[] = [];
    for (const r of rows ?? []) {
      const id = r.clinica_id as string;
      const mes = (r.mes_referencia as string).slice(0, 7);
      const key = `${id}|${mes}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ clinicaId: id, mesRef: mes });
    }

    const start = Date.now();
    let processed = 0;
    let errors = 0;

    for (const { clinicaId, mesRef } of pairs) {
      if (processed + errors >= MAX_PAIRS || Date.now() - start > MAX_MS) break;
      const result = await calcularEPersistirResumo(clinicaId, mesRef);
      if (result.ok) processed++;
      else errors++;
    }

    const hasMore = pairs.length > processed + errors;
    return NextResponse.json(
      {
        message: hasMore
          ? `${processed} resumos calculados. Atualize a página para continuar os demais.`
          : `${processed} resumos calculados com sucesso.`,
        processed,
        errors,
        total: pairs.length,
        hasMore,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
