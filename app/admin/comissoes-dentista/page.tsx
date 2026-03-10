import { fetchComissoesDentista, fetchConfigComissaoDentista } from "@/lib/comissao-dentista-queries";
import { ComissoesDentistaClient } from "./ComissoesDentistaClient";

export default async function ComissoesDentistaPage() {
  const [comissoes, config] = await Promise.all([
    fetchComissoesDentista(),
    fetchConfigComissaoDentista(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Comissões da Dentista</h2>
        <p className="mt-1 text-sm text-white/80">
          Controle de comissões por volume de vendas com tiers configuráveis.
        </p>
      </div>
      <ComissoesDentistaClient comissoes={comissoes} config={config} />
    </div>
  );
}
