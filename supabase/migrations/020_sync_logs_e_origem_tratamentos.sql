-- Migration 020: Tabela sync_logs + coluna origem em tratamentos_executados
-- Suporte ao sync diário automático via Vercel Cron

-- ============================================================
-- 1. Tabela sync_logs — rastreabilidade de sincronizações
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'success', 'error', 'skipped')),
  trigger text NOT NULL CHECK (trigger IN ('cron', 'manual')),
  orcamentos_fechados_inseridos int DEFAULT 0,
  orcamentos_abertos_inseridos int DEFAULT 0,
  pagamentos_inseridos int DEFAULT 0,
  tratamentos_inseridos int DEFAULT 0,
  recalculo_ok boolean,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_clinica_mes ON sync_logs(clinica_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status) WHERE status = 'error';

-- RLS: somente admin
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_logs_admin_select ON sync_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY sync_logs_admin_insert ON sync_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY sync_logs_admin_update ON sync_logs
  FOR UPDATE USING (true);

-- ============================================================
-- 2. Coluna origem em tratamentos_executados
-- ============================================================
ALTER TABLE tratamentos_executados
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';
