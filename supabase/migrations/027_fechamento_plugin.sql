-- 027_fechamento_plugin.sql
--
-- Base no sistema para o fechamento via plugin Claude (PRD/PRD-fechamento-plugin.md, F1).
--   1. fechamentos           — fechamento POR CLÍNICA, com snapshot e decisões (auditoria)
--   2. regras_procedimento   — mapeamento texto da planilha → procedimento (memória compartilhada)
--   3. substituir_tratamentos_mes — troca atômica dos procedimentos do mês (import idempotente)
--   4. backfill de fechamentos a partir de resumo_mensal.fechado_em
--
-- resumo_mensal.fechado_em continua existindo como espelho (isMesFechado / dashboards).

-- ---------------------------------------------------------------------------
-- 1. fechamentos
-- ---------------------------------------------------------------------------
CREATE TABLE public.fechamentos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          uuid NOT NULL REFERENCES public.clinicas_parceiras(id),
  mes_referencia      date NOT NULL CHECK (extract(day FROM mes_referencia) = 1),
  status              text NOT NULL DEFAULT 'fechado' CHECK (status IN ('fechado', 'reaberto')),
  fechado_por         uuid REFERENCES auth.users(id),
  fechado_em          timestamptz NOT NULL DEFAULT now(),
  reaberto_por        uuid REFERENCES auth.users(id),
  reaberto_em         timestamptz,
  motivo_reabertura   text,
  snapshot            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- resumo_mensal + totais no momento do fechamento
  decisoes            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- decisões tomadas no fechamento (texto livre estruturado)
  divergencias        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- divergências aceitas (fonte × sistema)
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Só um fechamento vigente por clínica/mês; reaberturas ficam como histórico.
CREATE UNIQUE INDEX fechamentos_vigente_uniq
  ON public.fechamentos (clinica_id, mes_referencia)
  WHERE status = 'fechado';

ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fechamentos_admin_all ON public.fechamentos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY fechamentos_parceiro_select ON public.fechamentos
  FOR SELECT TO authenticated USING (clinica_id = auth_clinica_id());

-- ---------------------------------------------------------------------------
-- 2. regras_procedimento
-- ---------------------------------------------------------------------------
-- padrao: trecho do texto da planilha, comparado sem acento e em minúsculas ("contém").
-- Avaliadas por prioridade crescente; a primeira que casar vence.
CREATE TABLE public.regras_procedimento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      uuid REFERENCES public.clinicas_parceiras(id),  -- NULL = vale para todas
  padrao          text NOT NULL CHECK (length(trim(padrao)) > 0),
  procedimento_id uuid REFERENCES public.procedimentos(id),
  ignorar         boolean NOT NULL DEFAULT false,
  prioridade      integer NOT NULL DEFAULT 100,
  observacao      text,
  ativo           boolean NOT NULL DEFAULT true,
  criado_por      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ignorar OR procedimento_id IS NOT NULL)
);

ALTER TABLE public.regras_procedimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY regras_procedimento_admin_all ON public.regras_procedimento
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed: regras usadas no refechamento Hirata mar–set/2026 (decisões do Fernando).
INSERT INTO public.regras_procedimento (padrao, procedimento_id, ignorar, prioridade, observacao)
SELECT r.padrao, p.id, r.ignorar, r.prioridade, r.observacao
FROM (VALUES
  ('alinhador invisivel',                         'Alinhador Fotona',                   false, 10, 'Início do caso de alinhador (custo uma vez)'),
  ('entrega de alinhadores',                      NULL,                                 true,  10, 'Entregas seguintes do alinhador: sem custo'),
  ('apresentacao do planejamento',                NULL,                                 true,  10, 'Sem custo'),
  ('apresentacao do exame biologix',              NULL,                                 true,  10, 'Apresentação de resultado: sem custo (≠ entrega)'),
  ('fotobiomodula',                               NULL,                                 true,  20, 'Fotobiomodulação: sem custo'),
  ('foto inicia',                                 NULL,                                 true,  20, 'Fotos iniciais: sem custo'),
  ('fotos inicia',                                NULL,                                 true,  20, 'Fotos iniciais: sem custo'),
  ('pedido',                                      NULL,                                 true,  20, 'Pedido de exame/RX: sem custo'),
  ('consulta',                                    'Consulta',                           false, 30, NULL),
  ('biologix',                                    'Exame Biologix',                     false, 40, 'Entrega Biologix'),
  ('apneia (6',                                   'Beauty Sleep - Apneia (6 Sessões)',  false, 50, 'Custo por sessão'),
  ('apneia (4',                                   'Beauty Sleep - Apneia (4 Sessões)',  false, 50, 'Custo por sessão'),
  ('apneia (1 sess',                              'Beauty Sleep - Apneia (1 sessão)',   false, 50, NULL),
  ('apneia (sessao extra',                        'Beauty Sleep - Apneia (Sessão Extra)', false, 50, NULL),
  ('ronco (6',                                    'Beauty Sleep - Ronco (6 Sessões)',   false, 50, 'Custo por sessão'),
  ('ronco (4',                                    'Beauty Sleep - Ronco (4 Sessões)',   false, 50, 'Custo por sessão'),
  ('ronco (1 sess',                               'Beauty Sleep - Ronco (1 sessão)',    false, 50, NULL),
  ('clareamento dental com laser fotona (sessao unica', 'Clareamento (1 sessão)',       false, 60, NULL),
  ('clareamento',                                 'Clareamento (4 sessões)',            false, 70, 'Custo por sessão; cortesia conta custo'),
  ('limpeza dental com laser fotona (manutencao', 'Limpeza a Laser (Manutenção)',       false, 60, NULL),
  ('limpeza',                                     'Limpeza a Laser (1 sessão)',         false, 70, NULL),
  ('profilaxia',                                  'Limpeza a Laser (1 sessão)',         false, 70, 'Decisão mai/26 (Maitê): profilaxia = limpeza'),
  ('desinfec',                                    'Desinfecção Periodontal',            false, 70, 'Cortesia conta custo')
) AS r(padrao, proc_nome, ignorar, prioridade, observacao)
LEFT JOIN LATERAL (
  SELECT id FROM public.procedimentos
  WHERE nome = r.proc_nome AND ativo
  ORDER BY created_at
  LIMIT 1
) p ON true
WHERE r.ignorar OR p.id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. substituir_tratamentos_mes — troca atômica (reimportar não duplica)
-- ---------------------------------------------------------------------------
-- p_linhas: [{ paciente_nome, procedimento_id, procedimento_nome, data_execucao, profissional, valor }]
CREATE OR REPLACE FUNCTION public.substituir_tratamentos_mes(
  p_clinica_id uuid,
  p_mes date,
  p_linhas jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inseridas integer;
BEGIN
  IF NOT (coalesce(is_admin(), false)
          OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: requer admin' USING errcode = '42501';
  END IF;

  IF extract(day FROM p_mes) <> 1 THEN
    RAISE EXCEPTION 'p_mes deve ser o 1º dia do mês';
  END IF;

  IF EXISTS (SELECT 1 FROM fechamentos
             WHERE clinica_id = p_clinica_id AND mes_referencia = p_mes AND status = 'fechado') THEN
    RAISE EXCEPTION 'Mês % está fechado para esta clínica', to_char(p_mes, 'YYYY-MM');
  END IF;

  DELETE FROM tratamentos_executados
  WHERE clinica_id = p_clinica_id
    AND mes_referencia = p_mes
    AND origem = 'manual';

  INSERT INTO tratamentos_executados
    (clinica_id, mes_referencia, paciente_nome, procedimento_id, procedimento_nome,
     quantidade, data_execucao, profissional, valor, origem)
  SELECT p_clinica_id, p_mes, l->>'paciente_nome', (l->>'procedimento_id')::uuid, l->>'procedimento_nome',
         1, (l->>'data_execucao')::date, l->>'profissional', coalesce((l->>'valor')::numeric, 0), 'manual'
  FROM jsonb_array_elements(p_linhas) l;

  GET DIAGNOSTICS v_inseridas = ROW_COUNT;
  RETURN v_inseridas;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.substituir_tratamentos_mes(uuid, date, jsonb) FROM anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- 4. Backfill: meses já fechados viram fechamentos
-- ---------------------------------------------------------------------------
INSERT INTO public.fechamentos (clinica_id, mes_referencia, status, fechado_por, fechado_em, snapshot, decisoes)
SELECT r.clinica_id, r.mes_referencia, 'fechado', r.fechado_por, r.fechado_em,
       jsonb_build_object('resumo', to_jsonb(r) - 'id'),
       '[{"origem": "backfill 027", "texto": "Fechado antes do fechamento por plugin"}]'::jsonb
FROM public.resumo_mensal r
WHERE r.fechado_em IS NOT NULL;
