-- ============================================================
-- BEAUTY SMILE PARTNERS — 004: RPC Registrar e Estornar Pagamento
-- Fase 4: Pagamentos e Inadimplência
-- ============================================================

-- View vw_inadimplentes: incluir orcamento_fechado_id para ações na UI
-- (DROP necessário porque CREATE OR REPLACE não permite mudar nomes/ordem de colunas)
DROP VIEW IF EXISTS vw_inadimplentes;
CREATE VIEW vw_inadimplentes AS
SELECT
  of.id AS orcamento_fechado_id,
  of.paciente_nome,
  of.clinica_id,
  cp.nome AS clinica_nome,
  of.valor_total,
  of.valor_pago,
  of.valor_em_aberto,
  of.data_fechamento,
  of.status,
  (CURRENT_DATE - of.data_fechamento)::integer AS dias_em_aberto
FROM orcamentos_fechados of
JOIN clinicas_parceiras cp ON cp.id = of.clinica_id
WHERE of.valor_em_aberto > 0
  AND of.status IN ('em_aberto', 'parcial')
ORDER BY of.valor_em_aberto DESC;

-- RPC: registrar_pagamento
-- Valida, insere pagamento, gera parcelas se cartão, atualiza valor_pago do orçamento.
CREATE OR REPLACE FUNCTION registrar_pagamento(
  p_orcamento_fechado_id UUID,
  p_valor DECIMAL,
  p_forma forma_pagamento,
  p_parcelas INTEGER,
  p_data_pagamento DATE,
  p_registrado_por UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orc orcamentos_fechados%ROWTYPE;
  v_pag pagamentos%ROWTYPE;
  v_valor_parcela DECIMAL(12,2);
  v_ultima_parcela DECIMAL(12,2);
  v_mes_recebimento DATE;
  v_i INTEGER;
  v_parcelas_geradas JSONB := '[]'::jsonb;
BEGIN
  -- (a) Buscar orçamento
  SELECT * INTO v_orc FROM orcamentos_fechados WHERE id = p_orcamento_fechado_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado' USING errcode = 'P0001';
  END IF;

  -- (b) Validações
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero' USING errcode = 'P0002';
  END IF;
  IF p_valor > v_orc.valor_em_aberto THEN
    RAISE EXCEPTION 'Valor excede o saldo em aberto (R$ %).', v_orc.valor_em_aberto USING errcode = 'P0002';
  END IF;
  IF p_data_pagamento > CURRENT_DATE THEN
    RAISE EXCEPTION 'Data do pagamento não pode ser futura' USING errcode = 'P0002';
  END IF;
  IF p_forma = 'cartao_credito' THEN
    IF p_parcelas IS NULL OR p_parcelas < 1 OR p_parcelas > 12 THEN
      RAISE EXCEPTION 'Parcelas deve ser entre 1 e 12 para cartão de crédito' USING errcode = 'P0002';
    END IF;
  ELSE
    -- outras formas: 1 parcela
    IF p_parcelas IS NULL OR p_parcelas != 1 THEN
      RAISE EXCEPTION 'Para esta forma de pagamento use 1 parcela' USING errcode = 'P0002';
    END IF;
  END IF;

  -- (c) Inserir pagamento
  INSERT INTO pagamentos (
    orcamento_fechado_id, clinica_id, valor, forma, parcelas, data_pagamento, registrado_por
  ) VALUES (
    p_orcamento_fechado_id, v_orc.clinica_id, p_valor, p_forma, p_parcelas, p_data_pagamento, p_registrado_por
  )
  RETURNING * INTO v_pag;

  -- (d) Parcelas de cartão: arredondamento (primeiras N-1 com ROUND, última = valor - soma)
  IF p_forma = 'cartao_credito' AND p_parcelas > 1 THEN
    v_valor_parcela := ROUND(p_valor / p_parcelas, 2);
    v_ultima_parcela := p_valor - (v_valor_parcela * (p_parcelas - 1));

    FOR v_i IN 1..p_parcelas LOOP
      -- D+30: parcela 1 = mês seguinte ao pagamento, parcela 2 = +2 meses, etc.
      v_mes_recebimento := (DATE_TRUNC('month', p_data_pagamento)::date + (v_i * INTERVAL '1 month'))::date;

      INSERT INTO parcelas_cartao (
        pagamento_id, clinica_id, parcela_numero, total_parcelas, valor_parcela, mes_recebimento, status
      ) VALUES (
        v_pag.id, v_orc.clinica_id, v_i, p_parcelas,
        CASE WHEN v_i < p_parcelas THEN v_valor_parcela ELSE v_ultima_parcela END,
        v_mes_recebimento, 'projetado'
      );

      v_parcelas_geradas := v_parcelas_geradas || jsonb_build_object(
        'parcela_numero', v_i, 'total_parcelas', p_parcelas,
        'valor_parcela', CASE WHEN v_i < p_parcelas THEN v_valor_parcela ELSE v_ultima_parcela END,
        'mes_recebimento', v_mes_recebimento
      );
    END LOOP;
  END IF;

  -- (e) Atualizar valor_pago do orçamento (trigger atualiza status)
  UPDATE orcamentos_fechados
  SET valor_pago = valor_pago + p_valor
  WHERE id = p_orcamento_fechado_id;

  RETURN jsonb_build_object(
    'pagamento', to_jsonb(v_pag),
    'parcelas', v_parcelas_geradas
  );
END;
$$;

-- RPC: estornar_pagamento
CREATE OR REPLACE FUNCTION estornar_pagamento(p_pagamento_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pag pagamentos%ROWTYPE;
BEGIN
  SELECT * INTO v_pag FROM pagamentos WHERE id = p_pagamento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado' USING errcode = 'P0001';
  END IF;

  -- Deletar parcelas (CASCADE já faria; sendo explícito)
  DELETE FROM parcelas_cartao WHERE pagamento_id = p_pagamento_id;

  -- Devolver valor ao orçamento
  UPDATE orcamentos_fechados
  SET valor_pago = valor_pago - v_pag.valor
  WHERE id = v_pag.orcamento_fechado_id;

  -- Deletar pagamento
  DELETE FROM pagamentos WHERE id = p_pagamento_id;

  RETURN jsonb_build_object('ok', true, 'valor_estornado', v_pag.valor);
END;
$$;
