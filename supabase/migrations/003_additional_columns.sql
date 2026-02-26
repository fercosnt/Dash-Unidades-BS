-- ============================================================
-- BEAUTY SMILE PARTNERS — 003: Colunas adicionais (Anexo C)
-- orcamentos_fechados, orcamentos_abertos, tratamentos_executados
-- ============================================================

-- orcamentos_fechados
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS profissional TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS paciente_telefone TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS procedimentos_texto TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS valor_bruto DECIMAL(12,2);
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS desconto_percentual DECIMAL(5,2);
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS desconto_reais DECIMAL(12,2);
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS tem_indicacao BOOLEAN NOT NULL DEFAULT false;

-- orcamentos_abertos (campos opcionais para consistência)
ALTER TABLE orcamentos_abertos ADD COLUMN IF NOT EXISTS profissional TEXT;
ALTER TABLE orcamentos_abertos ADD COLUMN IF NOT EXISTS data_fechamento DATE;

-- tratamentos_executados
ALTER TABLE tratamentos_executados ADD COLUMN IF NOT EXISTS profissional TEXT;
ALTER TABLE tratamentos_executados ADD COLUMN IF NOT EXISTS regiao TEXT;
ALTER TABLE tratamentos_executados ADD COLUMN IF NOT EXISTS valor DECIMAL(12,2) DEFAULT 0;
