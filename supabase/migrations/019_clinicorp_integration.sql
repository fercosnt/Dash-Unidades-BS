-- Migration 019: Integração Clinicorp API
-- Adiciona campos para credenciais Clinicorp nas clínicas e IDs de idempotência

-- 1. Credenciais Clinicorp na tabela clinicas_parceiras
ALTER TABLE clinicas_parceiras
  ADD COLUMN IF NOT EXISTS clinicorp_subscriber_id text,
  ADD COLUMN IF NOT EXISTS clinicorp_username text,
  ADD COLUMN IF NOT EXISTS clinicorp_token text,
  ADD COLUMN IF NOT EXISTS clinicorp_business_id text;

COMMENT ON COLUMN clinicas_parceiras.clinicorp_subscriber_id IS 'Subscriber ID da clínica no Clinicorp';
COMMENT ON COLUMN clinicas_parceiras.clinicorp_username IS 'Username para autenticação Basic Auth na API Clinicorp';
COMMENT ON COLUMN clinicas_parceiras.clinicorp_token IS 'Token para autenticação Basic Auth na API Clinicorp';
COMMENT ON COLUMN clinicas_parceiras.clinicorp_business_id IS 'Business ID da clínica no Clinicorp';

-- 2. ID de idempotência em orcamentos_fechados (TreatmentId da API)
ALTER TABLE orcamentos_fechados
  ADD COLUMN IF NOT EXISTS clinicorp_treatment_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_fechados_clinicorp_treatment
  ON orcamentos_fechados (clinica_id, clinicorp_treatment_id)
  WHERE clinicorp_treatment_id IS NOT NULL;

COMMENT ON COLUMN orcamentos_fechados.clinicorp_treatment_id IS 'TreatmentId da API Clinicorp para idempotência na sincronização';

-- 3. ID de idempotência em orcamentos_abertos (TreatmentId da API)
ALTER TABLE orcamentos_abertos
  ADD COLUMN IF NOT EXISTS clinicorp_treatment_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_abertos_clinicorp_treatment
  ON orcamentos_abertos (clinica_id, clinicorp_treatment_id)
  WHERE clinicorp_treatment_id IS NOT NULL;

COMMENT ON COLUMN orcamentos_abertos.clinicorp_treatment_id IS 'TreatmentId da API Clinicorp para idempotência na sincronização';

-- 4. ID de idempotência em pagamentos (PaymentHeaderId da API)
ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS clinicorp_payment_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamentos_clinicorp_payment
  ON pagamentos (clinica_id, clinicorp_payment_id)
  WHERE clinicorp_payment_id IS NOT NULL;

COMMENT ON COLUMN pagamentos.clinicorp_payment_id IS 'PaymentHeaderId da API Clinicorp para idempotência na sincronização';

-- 5. Campo origem para distinguir dados manuais vs API
ALTER TABLE orcamentos_fechados
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual'
  CHECK (origem IN ('manual', 'clinicorp'));

ALTER TABLE orcamentos_abertos
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual'
  CHECK (origem IN ('manual', 'clinicorp'));

ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual'
  CHECK (origem IN ('manual', 'clinicorp'));
