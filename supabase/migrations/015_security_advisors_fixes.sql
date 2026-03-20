-- ============================================================
-- BEAUTY SMILE PARTNERS — 015: Security Advisors Fixes
-- Corrige alertas do Supabase Security Advisor:
-- 1. Views SECURITY DEFINER → SECURITY INVOKER (2 ERRORs)
-- 2. Functions sem search_path fixo (4 WARNs)
-- ============================================================

-- ============================================================
-- 1. Views: recriar com SECURITY INVOKER
--    (views no Postgres herdam SECURITY DEFINER do owner por padrão;
--     WITH (security_invoker = true) força usar permissões do caller)
-- ============================================================

-- 1a. vw_inadimplentes
DROP VIEW IF EXISTS vw_inadimplentes;
CREATE VIEW vw_inadimplentes
WITH (security_invoker = true)
AS
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

-- 1b. vw_recebimentos_futuros
DROP VIEW IF EXISTS vw_recebimentos_futuros;
CREATE VIEW vw_recebimentos_futuros
WITH (security_invoker = true)
AS
SELECT
  pc.clinica_id,
  cp.nome AS clinica_nome,
  pc.mes_recebimento,
  SUM(pc.valor_parcela) AS total_projetado,
  COUNT(*) AS total_parcelas
FROM parcelas_cartao pc
JOIN clinicas_parceiras cp ON cp.id = pc.clinica_id
WHERE pc.status = 'projetado'
GROUP BY pc.clinica_id, cp.nome, pc.mes_recebimento
ORDER BY pc.mes_recebimento;

-- ============================================================
-- 2. Functions: adicionar SET search_path = public
--    (auth_clinica_id e is_admin mantêm SECURITY DEFINER porque
--     precisam acessar profiles independente do RLS do caller)
-- ============================================================

-- 2a. update_updated_at (trigger function, não precisa SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2b. auth_clinica_id (SECURITY DEFINER necessário para RLS)
CREATE OR REPLACE FUNCTION public.auth_clinica_id()
RETURNS uuid AS $$
  SELECT clinica_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER
SET search_path = public;

-- 2c. is_admin (SECURITY DEFINER necessário para RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER
SET search_path = public;

-- 2d. update_orcamento_status (trigger function, não precisa SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_orcamento_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valor_pago >= NEW.valor_total THEN
    NEW.status = 'quitado';
  ELSIF NEW.valor_pago > 0 THEN
    NEW.status = 'parcial';
  ELSE
    NEW.status = 'em_aberto';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
