import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/parcelas/marcar-recebidas
 *
 * Marca como "recebido" todas as parcelas de cartão cujo mês de recebimento já passou
 * (mes_recebimento <= primeiro dia do mês atual). Usado pelo n8n em cron diário.
 *
 * Autenticação: header X-Webhook-Secret (igual a N8N_WEBHOOK_SECRET).
 */
export async function POST(request: Request) {
  const expected = process.env.N8N_WEBHOOK_SECRET;
  const secret = request.headers.get("X-Webhook-Secret");

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Primeiro dia do mês atual (YYYY-MM-01)
    const d = new Date();
    const limite =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

    // Buscar IDs das parcelas que serão atualizadas (para contar)
    const { data: rows, error: selectError } = await supabase
      .from("parcelas_cartao")
      .select("id")
      .lte("mes_recebimento", limite)
      .eq("status", "projetado");

    if (selectError) {
      return NextResponse.json(
        { error: selectError.message || "Erro ao buscar parcelas" },
        { status: 500 }
      );
    }

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) {
      return NextResponse.json({ updated: 0, message: "Nenhuma parcela a atualizar" });
    }

    const { error: updateError } = await supabase
      .from("parcelas_cartao")
      .update({ status: "recebido" })
      .in("id", ids);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Erro ao atualizar parcelas" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated: ids.length,
      limite,
      message: `${ids.length} parcela(s) marcada(s) como recebida(s)`,
    });
  } catch (err) {
    console.error("[api/parcelas/marcar-recebidas] Erro interno ao marcar parcelas:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
