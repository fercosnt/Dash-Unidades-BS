-- ============================================================
-- BEAUTY SMILE PARTNERS — 002: Row Level Security (RLS)
-- Idempotente: drop policies se existirem e recria.
-- Executar após 001_initial_schema.sql.
-- ============================================================

-- 1. profiles — admin vê todos; parceiro vê só o próprio
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "self_read" ON public.profiles;

CREATE POLICY "admin_full_access"
  ON public.profiles FOR ALL
  USING (public.is_admin());

CREATE POLICY "self_read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- 2. clinicas_parceiras — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.clinicas_parceiras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.clinicas_parceiras;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.clinicas_parceiras;

CREATE POLICY "admin_full_access"
  ON public.clinicas_parceiras FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.clinicas_parceiras FOR SELECT
  USING (id = public.auth_clinica_id());

-- 3. procedimentos — admin CRUD; parceiro só leitura
-- ============================================================
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.procedimentos;
DROP POLICY IF EXISTS "parceiro_read" ON public.procedimentos;

CREATE POLICY "admin_full_access"
  ON public.procedimentos FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read"
  ON public.procedimentos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- 4. configuracoes_financeiras — admin CRUD; parceiro só leitura
-- ============================================================
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.configuracoes_financeiras;
DROP POLICY IF EXISTS "parceiro_read" ON public.configuracoes_financeiras;

CREATE POLICY "admin_full_access"
  ON public.configuracoes_financeiras FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read"
  ON public.configuracoes_financeiras FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- 5. medicos_indicadores — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.medicos_indicadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.medicos_indicadores;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.medicos_indicadores;

CREATE POLICY "admin_full_access"
  ON public.medicos_indicadores FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.medicos_indicadores FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 6. upload_batches — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.upload_batches;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.upload_batches;

CREATE POLICY "admin_full_access"
  ON public.upload_batches FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.upload_batches FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 7. orcamentos_fechados — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.orcamentos_fechados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.orcamentos_fechados;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.orcamentos_fechados;

CREATE POLICY "admin_full_access"
  ON public.orcamentos_fechados FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.orcamentos_fechados FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 8. orcamentos_abertos — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.orcamentos_abertos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.orcamentos_abertos;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.orcamentos_abertos;

CREATE POLICY "admin_full_access"
  ON public.orcamentos_abertos FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.orcamentos_abertos FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 9. tratamentos_executados — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.tratamentos_executados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.tratamentos_executados;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.tratamentos_executados;

CREATE POLICY "admin_full_access"
  ON public.tratamentos_executados FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.tratamentos_executados FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 10. pagamentos — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.pagamentos;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.pagamentos;

CREATE POLICY "admin_full_access"
  ON public.pagamentos FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.pagamentos FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 11. parcelas_cartao — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.parcelas_cartao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.parcelas_cartao;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.parcelas_cartao;

CREATE POLICY "admin_full_access"
  ON public.parcelas_cartao FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.parcelas_cartao FOR SELECT
  USING (clinica_id = public.auth_clinica_id());

-- 12. resumo_mensal — admin CRUD; parceiro só leitura da própria clínica
-- ============================================================
ALTER TABLE public.resumo_mensal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.resumo_mensal;
DROP POLICY IF EXISTS "parceiro_read_own" ON public.resumo_mensal;

CREATE POLICY "admin_full_access"
  ON public.resumo_mensal FOR ALL
  USING (public.is_admin());

CREATE POLICY "parceiro_read_own"
  ON public.resumo_mensal FOR SELECT
  USING (clinica_id = public.auth_clinica_id());
