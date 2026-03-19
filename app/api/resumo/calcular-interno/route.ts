import { NextResponse } from "next/server";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";

type Body = { clinica_id?: string; mes_referencia?: string };

export async function POST(request: Request) {
  const secret = request.headers.get("x-service-secret");
  if (!secret || secret !== process.env.RESUMO_SERVICE_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Body;
    const { clinica_id, mes_referencia } = body;

    if (!clinica_id || !mes_referencia) {
      return NextResponse.json(
        { error: "clinica_id e mes_referencia são obrigatórios" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(mes_referencia)) {
      return NextResponse.json(
        { error: "mes_referencia deve ser YYYY-MM" },
        { status: 400 }
      );
    }

    const result = await calcularEPersistirResumo(clinica_id, mes_referencia);

    if (!result.ok) {
      const status = result.error.includes("não encontrada") ? 404
        : result.error.includes("Configure") ? 400
        : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: "Resumo calculado com sucesso." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
