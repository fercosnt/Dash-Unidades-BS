import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id: pagamentoId } = await params;
    if (!pagamentoId) {
      return NextResponse.json({ error: "id do pagamento é obrigatório" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
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

    // Buscar orcamento_fechado_id antes de estornar (para webhook)
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("orcamento_fechado_id")
      .eq("id", pagamentoId)
      .single();

    const { data: rpcResult, error: rpcError } = await supabase.rpc("estornar_pagamento", {
      p_pagamento_id: pagamentoId,
    });

    if (rpcError) {
      const msg = rpcError.message || "Erro ao estornar pagamento";
      const code = rpcError.code;
      if (code === "P0001") return NextResponse.json({ error: msg }, { status: 404 });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (pag?.orcamento_fechado_id) {
      const { data: orc } = await supabase
        .from("orcamentos_fechados")
        .select("clinica_id, mes_referencia")
        .eq("id", pag.orcamento_fechado_id)
        .single();

      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
      if (webhookUrl && webhookSecret && orc?.clinica_id && orc?.mes_referencia) {
        const mesRef = String(orc.mes_referencia).slice(0, 7);
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Secret": webhookSecret,
            },
            body: JSON.stringify({
              clinica_id: orc.clinica_id,
              mes_referencia: `${mesRef}-01`,
              action: "recalcular",
            }),
          });
        } catch {
          // não bloqueia
        }
      }
    }

    return NextResponse.json(rpcResult ?? { ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
