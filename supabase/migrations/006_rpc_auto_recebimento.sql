-- ============================================================
-- BEAUTY SMILE PARTNERS — 006: RPC Auto Recebimento de Parcelas de Cartão
-- Fase 5: Automação de recebimentos (n8n)
-- ============================================================
--
-- Esta função será chamada pelo n8n (via REST/RPC) para marcar
-- automaticamente como "recebido" todas as parcelas de cartão
-- cujo mês de recebimento já passou.
--
-- Lógica:
-- - Considera um parâmetro opcional p_data_ref (DATE), default = CURRENT_DATE
-- - Calcula o primeiro dia do mês de referência (date_trunc('month', p_data_ref))
-- - Atualiza parcelas_cartao.status de 'projetado' para 'recebido'
--   quando mes_recebimento <= mês de referência
-- - Retorna a quantidade de linhas atualizadas
--
-- Uso pela API REST (Supabase):
--   POST /rest/v1/rpc/auto_receber_parcelas_cartao
--   Body JSON (opcional):
--     { "p_data_ref": "2026-02-15" }
--   Se não enviar p_data_ref, usa CURRENT_DATE no banco.
--

CREATE OR REPLACE FUNCTION auto_receber_parcelas_cartao(
  p_data_ref DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd_atualizada INTEGER;
  v_limite DATE;
BEGIN
  -- Considera sempre o primeiro dia do mês de referência
  v_limite := date_trunc('month', p_data_ref)::date;

  UPDATE parcelas_cartao
  SET status = 'recebido'
  WHERE status = 'projetado'
    AND mes_recebimento <= v_limite;

  GET DIAGNOSTICS v_qtd_atualizada = ROW_COUNT;

  RETURN v_qtd_atualizada;
END;
$$;

