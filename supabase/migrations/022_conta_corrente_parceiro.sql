-- 022: Conta corrente do parceiro (modelo único)
-- (a) repasse: permitir 0..N por mês (saída em dinheiro); remover unique por mês.
--     coluna `tipo` mantida ('dinheiro') p/ extensibilidade futura, sem ramificação.
ALTER TABLE repasses_mensais
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'dinheiro'
    CHECK (tipo IN ('dinheiro'));

ALTER TABLE repasses_mensais
  DROP CONSTRAINT IF EXISTS repasses_mensais_clinica_id_mes_referencia_key;

-- (b) RPC: resultado operacional por mês-calendário (todo mês desde a 1ª atividade)
--     resultado = (1 - %BS) × (recebido_caixa_do_mês − custos_do_mês)
--     custos: reusa resumo_mensal (meses com venda); meses sem venda = só mão de obra fixa
CREATE OR REPLACE FUNCTION calcular_resultado_mensal_parceiro(p_clinica_id uuid)
RETURNS TABLE (
  mes date,
  recebido numeric,
  custos numeric,
  resultado numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT (1 - percentual_beauty_smile/100.0) AS pct_parceiro
    FROM configuracoes_financeiras WHERE vigencia_fim IS NULL LIMIT 1
  ),
  clinica AS (
    SELECT custo_mao_de_obra AS mao_obra FROM clinicas_parceiras WHERE id = p_clinica_id
  ),
  bounds AS (
    SELECT date_trunc('month', LEAST(
      COALESCE((SELECT MIN(mes_referencia) FROM orcamentos_fechados WHERE clinica_id=p_clinica_id), CURRENT_DATE),
      COALESCE((SELECT MIN(data_pagamento) FROM pagamentos WHERE clinica_id=p_clinica_id), CURRENT_DATE)
    ))::date AS ini,
    date_trunc('month', CURRENT_DATE)::date AS fim
  ),
  meses AS (
    SELECT generate_series(b.ini, b.fim, interval '1 month')::date AS mes FROM bounds b
  ),
  recebido_diretos AS (
    SELECT date_trunc('month', pg.data_pagamento)::date AS mes, SUM(pg.valor) AS v
    FROM pagamentos pg
    WHERE pg.clinica_id = p_clinica_id
      AND NOT (pg.forma = 'cartao_credito' AND pg.parcelas > 1)
    GROUP BY 1
  ),
  recebido_parcelas AS (
    SELECT date_trunc('month', pc.mes_recebimento)::date AS mes, SUM(pc.valor_parcela) AS v
    FROM parcelas_cartao pc
    WHERE pc.clinica_id = p_clinica_id AND pc.status = 'recebido'
    GROUP BY 1
  ),
  custos_resumo AS (
    SELECT date_trunc('month', mes_referencia)::date AS mes,
           (total_taxa_cartao + total_imposto_nf + total_custo_mao_obra
            + total_custos_procedimentos + total_comissoes_medicas) AS c
    FROM resumo_mensal WHERE clinica_id = p_clinica_id
  )
  SELECT
    m.mes,
    ROUND(COALESCE(rd.v,0) + COALESCE(rp.v,0), 2) AS recebido,
    ROUND(COALESCE(cr.c, (SELECT mao_obra FROM clinica)), 2) AS custos,
    ROUND((SELECT pct_parceiro FROM cfg)
          * (COALESCE(rd.v,0) + COALESCE(rp.v,0)
             - COALESCE(cr.c, (SELECT mao_obra FROM clinica))), 2) AS resultado
  FROM meses m
  LEFT JOIN recebido_diretos rd ON rd.mes = m.mes
  LEFT JOIN recebido_parcelas rp ON rp.mes = m.mes
  LEFT JOIN custos_resumo cr ON cr.mes = m.mes
  ORDER BY m.mes;
$$;

GRANT EXECUTE ON FUNCTION calcular_resultado_mensal_parceiro(uuid) TO authenticated;
