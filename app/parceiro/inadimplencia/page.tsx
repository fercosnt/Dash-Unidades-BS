import { listInadimplentes, getKpisInadimplencia } from "@/app/admin/inadimplencia/actions";
import { getProjecaoRecebimentos, type ProjecaoRow } from "@/app/admin/pagamentos/actions";
import { InadimplenciaParceiroClient } from "./InadimplenciaParceiroClient";

function getProximos6Meses(): { mes_inicio: string; mes_fim: string } {
  const d = new Date();
  const mes_inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  d.setMonth(d.getMonth() + 6);
  const mes_fim = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { mes_inicio, mes_fim };
}

export default async function InadimplenciaParceiroPage() {
  const { mes_inicio, mes_fim } = getProximos6Meses();
  const [initialList, initialKpis, projecao] = await Promise.all([
    listInadimplentes({}),
    getKpisInadimplencia(),
    getProjecaoRecebimentos({ mes_inicio, mes_fim }),
  ]);

  return (
    <InadimplenciaParceiroClient
      initialList={initialList}
      initialKpis={initialKpis}
      projecao={projecao}
    />
  );
}
