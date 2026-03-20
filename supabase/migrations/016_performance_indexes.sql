-- ============================================================
-- BEAUTY SMILE PARTNERS — 016: Performance Indexes
-- Corrige alertas do Supabase Performance Advisor:
-- 1. Índices em foreign keys sem cobertura (17 INFOs)
-- 2. Remove índice não utilizado (1 INFO)
-- ============================================================

-- 1. Índices em foreign keys sem cobertura
-- ============================================================

-- abatimentos_debito
CREATE INDEX IF NOT EXISTS idx_abatimentos_debito_debito_id ON abatimentos_debito(debito_id);
CREATE INDEX IF NOT EXISTS idx_abatimentos_debito_repasse_id ON abatimentos_debito(repasse_id);

-- comissoes_dentista
CREATE INDEX IF NOT EXISTS idx_comissoes_dentista_config_id ON comissoes_dentista(config_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_dentista_dentista_id ON comissoes_dentista(dentista_id);

-- debito_parceiro
CREATE INDEX IF NOT EXISTS idx_debito_parceiro_clinica_id ON debito_parceiro(clinica_id);

-- itens_orcamento
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_procedimento_id ON itens_orcamento(procedimento_id);

-- medicos_indicadores
CREATE INDEX IF NOT EXISTS idx_medicos_indicadores_clinica_id ON medicos_indicadores(clinica_id);

-- orcamentos_abertos
CREATE INDEX IF NOT EXISTS idx_orcamentos_abertos_upload_batch_id ON orcamentos_abertos(upload_batch_id);

-- orcamentos_fechados
CREATE INDEX IF NOT EXISTS idx_orcamentos_fechados_medico_indicador_id ON orcamentos_fechados(medico_indicador_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_fechados_upload_batch_id ON orcamentos_fechados(upload_batch_id);

-- pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica_id ON pagamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_registrado_por ON pagamentos(registrado_por);

-- parcelas_cartao
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_clinica_id ON parcelas_cartao(clinica_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cartao_pagamento_id ON parcelas_cartao(pagamento_id);

-- tratamentos_executados
CREATE INDEX IF NOT EXISTS idx_tratamentos_procedimento_id ON tratamentos_executados(procedimento_id);
CREATE INDEX IF NOT EXISTS idx_tratamentos_upload_batch_id ON tratamentos_executados(upload_batch_id);

-- upload_batches
CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_by ON upload_batches(uploaded_by);

-- 2. Remover índice não utilizado
-- ============================================================
DROP INDEX IF EXISTS idx_itens_orcamento_categoria;
