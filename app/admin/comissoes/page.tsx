import { fetchComissoesMedicos } from "@/lib/comissao-medicos-queries";
import { listarMedicos } from "@/app/admin/configuracoes/medicos/actions";
import { ComissoesMedicosClient } from "./ComissoesMedicosClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function ComissoesMedicosPage() {
  const [comissoes, medicos] = await Promise.all([
    fetchComissoesMedicos(),
    listarMedicos(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Comissões Médicos</h2>
        <p className="mt-1 text-sm text-white/80">
          Controle de comissões dos médicos indicadores por mês e clínica.
        </p>
      </div>
      <ComissoesMedicosClient comissoes={comissoes} medicos={medicos} />
    </div>
  );
}
