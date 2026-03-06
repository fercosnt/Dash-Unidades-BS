import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Body = {
  orcamento_fechado_id?: string;
  valor?: number;
  forma?: string;
  parcelas?: number;
  data_pagamento?: string;
};

const FORMAS_VALIDAS = ["cartao_credito", "cartao_debito", "pix", "dinheiro"];

export async function POST(request: Request) {
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

    const body = (await request.json()) as Body;
    const { orcamento_fechado_id, valor, forma, parcelas, data_pagamento } = body;

    if (!orcamento_fechado_id) {
      return NextResponse.json({ error: "orcamento_fechado_id é obrigatório" }, { status: 400 });
    }
    if (valor == null || typeof valor !== "number" || valor <= 0) {
      return NextResponse.json({ error: "valor deve ser um número maior que zero" }, { status: 400 });
    }
    if (!forma || !FORMAS_VALIDAS.includes(forma)) {
      return NextResponse.json(
        { error: "forma deve ser: cartao_credito, cartao_debito, pix ou dinheiro" },
        { status: 400 }
      );
    }
    const numParcelas = parcelas != null ? Number(parcelas) : 1;
    if (forma === "cartao_credito" && (numParcelas < 1 || numParcelas > 12)) {
      return NextResponse.json({ error: "parcelas deve ser entre 1 e 12 para cartão de crédito" }, { status: 400 });
    }
    if (forma !== "cartao_credito" && numParcelas !== 1) {
      return NextResponse.json({ error: "Para esta forma de pagamento use 1 parcela" }, { status: 400 });
    }
    if (!data_pagamento || !/^\d{4}-\d{2}-\d{2}$/.test(data_pagamento)) {
      return NextResponse.json({ error: "data_pagamento é obrigatória (YYYY-MM-DD)" }, { status: 400 });
    }
    const hoje = new Date().toISOString().slice(0, 10);
    if (data_pagamento > hoje) {
      return NextResponse.json({ error: "Data do pagamento não pode ser futura" }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("registrar_pagamento", {
      p_orcamento_fechado_id: orcamento_fechado_id,
      p_valor: valor,
      p_forma: forma,
      p_parcelas: numParcelas,
      p_data_pagamento: data_pagamento,
      p_registrado_por: user.id,
    });

    if (rpcError) {
      const msg = rpcError.message || "Erro ao registrar pagamento";
      const code = rpcError.code;
      if (code === "P0001") return NextResponse.json({ error: msg }, { status: 404 });
      if (code === "P0002") return NextResponse.json({ error: msg }, { status: 400 });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Buscar orçamento para clinica_id e mes_referencia (webhook recálculo)
    const { data: orc } = await supabase
      .from("orcamentos_fechados")
      .select("clinica_id, mes_referencia")
      .eq("id", orcamento_fechado_id)
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
        // não bloqueia a resposta
      }
    }

    return NextResponse.json(rpcResult ?? { pagamento: null, parcelas: [] }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
