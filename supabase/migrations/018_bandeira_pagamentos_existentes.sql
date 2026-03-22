-- ============================================================
-- Migration 018: Adicionar coluna bandeira em pagamentos
-- ============================================================
-- A migration 017 deveria ter adicionado essa coluna, mas
-- parece que o ALTER TABLE não foi executado. Este script
-- adiciona a coluna e atualiza os pagamentos existentes.
-- ============================================================

-- 1. Adicionar coluna bandeira (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'bandeira'
  ) THEN
    ALTER TABLE pagamentos ADD COLUMN bandeira text
      CHECK (bandeira IS NULL OR bandeira IN ('visa_master', 'outros'));
  END IF;
END $$;

-- 2. Setar todos os pagamentos de cartão existentes como visa_master
UPDATE pagamentos
SET bandeira = 'visa_master'
WHERE forma IN ('cartao_credito', 'cartao_debito')
  AND bandeira IS NULL;
