-- 012: Fechamento de mês — colunas para controlar meses fechados
ALTER TABLE resumo_mensal ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE resumo_mensal ADD COLUMN IF NOT EXISTS fechado_por UUID DEFAULT NULL;
