-- 026_rls_hardening_rpcs_security_definer.sql
--
-- Correção de segurança (auditoria RLS 2026-06-07):
-- As funções SECURITY DEFINER abaixo bypassam o RLS e estavam concedidas a
-- anon/authenticated SEM guard interno. Um parceiro (somente-leitura) — ou um
-- anon com a anon key — podia chamá-las direto no PostgREST (/rest/v1/rpc/...),
-- pulando as rotas Next que checam admin, e:
--   - registrar_pagamento: criar pagamentos em qualquer orçamento
--   - estornar_pagamento : deletar qualquer pagamento
--   - auto_receber_parcelas_cartao: virar todas as parcelas p/ 'recebido'
--
-- Fix: guard interno em cada função, permitindo APENAS admin (is_admin()) OU o
-- service_role (usado pela sync Clinicorp e pelo n8n WF3). Parceiro/anon: bloqueados.
-- Guard validado nos 4 papéis (admin/service_role passam; parceiro/anon bloqueados).
--
-- Também corrige as policies de sync_logs (INSERT/UPDATE estavam `to public` com
-- check `true` — qualquer um escrevia). O app escreve sync_logs via service role
-- (bypassa RLS), então restringir a is_admin() não quebra nada.

-- ---------------------------------------------------------------------------
-- 1. registrar_pagamento — guard + corpo preservado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pagamento(
  p_orcamento_fechado_id uuid, p_valor numeric, p_forma forma_pagamento,
  p_parcelas integer, p_data_pagamento date, p_registrado_por uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orc orcamentos_fechados%ROWTYPE;
  v_pag pagamentos%ROWTYPE;
  v_valor_parcela DECIMAL(12,2);
  v_ultima_parcela DECIMAL(12,2);
  v_mes_recebimento DATE;
  v_i INTEGER;
  v_parcelas_geradas JSONB := '[]'::jsonb;
BEGIN
  -- GUARD: somente admin ou service_role (sync/n8n)
  IF NOT (coalesce(is_admin(), false)
          OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: requer admin' USING errcode = '42501';
  END IF;

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
$function$;

-- ---------------------------------------------------------------------------
-- 2. estornar_pagamento — guard + corpo preservado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estornar_pagamento(p_pagamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pag pagamentos%ROWTYPE;
BEGIN
  -- GUARD: somente admin ou service_role
  IF NOT (coalesce(is_admin(), false)
          OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: requer admin' USING errcode = '42501';
  END IF;

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
$function$;

-- ---------------------------------------------------------------------------
-- 3. auto_receber_parcelas_cartao — guard + corpo preservado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_receber_parcelas_cartao(p_data_ref date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_qtd_atualizada INTEGER;
  v_limite DATE;
BEGIN
  -- GUARD: somente admin ou service_role (n8n WF3)
  IF NOT (coalesce(is_admin(), false)
          OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: requer admin' USING errcode = '42501';
  END IF;

  -- Considera sempre o primeiro dia do mês de referência
  v_limite := date_trunc('month', p_data_ref)::date;

  UPDATE parcelas_cartao
  SET status = 'recebido'
  WHERE status = 'projetado'
    AND mes_recebimento <= v_limite;

  GET DIAGNOSTICS v_qtd_atualizada = ROW_COUNT;

  RETURN v_qtd_atualizada;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. sync_logs — restringir INSERT/UPDATE a admin (eram `to public` / `true`)
--    (app escreve via service role, que bypassa RLS — não quebra)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sync_logs_admin_insert ON public.sync_logs;
DROP POLICY IF EXISTS sync_logs_admin_update ON public.sync_logs;

CREATE POLICY sync_logs_admin_insert ON public.sync_logs
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY sync_logs_admin_update ON public.sync_logs
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- 5. Defesa em profundidade: tirar EXECUTE do anon nas 3 RPCs de escrita.
--    (authenticated permanece — as rotas admin chamam via sessão do usuário e
--     o guard interno protege; service_role permanece p/ sync/n8n.)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.registrar_pagamento(uuid, numeric, forma_pagamento, integer, date, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.estornar_pagamento(uuid) FROM anon, public;
-- auto_receber: não tem caller authenticated (só n8n WF3 via service_role) → trava total
REVOKE EXECUTE ON FUNCTION public.auto_receber_parcelas_cartao(date) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento(uuid, numeric, forma_pagamento, integer, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estornar_pagamento(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_receber_parcelas_cartao(date) TO service_role;
