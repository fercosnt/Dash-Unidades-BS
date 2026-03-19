-- 013: Itens de orcamento — desmembramento de tratamentos por orcamento

-- 1a. Preco de venda na tabela de procedimentos (diferente de custo_fixo que e custo interno)
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS valor_tabela DECIMAL(12,2) DEFAULT 0;

-- 1b. Tabela de itens desmembrados por orcamento
CREATE TABLE IF NOT EXISTS itens_orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_fechado_id UUID NOT NULL REFERENCES orcamentos_fechados(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  procedimento_id UUID REFERENCES procedimentos(id),
  procedimento_nome_original TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_tabela DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_proporcional DECIMAL(12,2) NOT NULL DEFAULT 0,
  categoria TEXT,
  match_status TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1c. Status do split no orcamento (NULL = nao processado, 'auto', 'revisado')
ALTER TABLE orcamentos_fechados ADD COLUMN IF NOT EXISTS split_status TEXT DEFAULT NULL;

-- 1d. Indices
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_orcamento ON itens_orcamento(orcamento_fechado_id);
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_clinica_proc ON itens_orcamento(clinica_id, procedimento_id);
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_categoria ON itens_orcamento(categoria);

-- 1e. RLS policies
ALTER TABLE itens_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê todos os itens" ON itens_orcamento
  FOR ALL USING (is_admin());

CREATE POLICY "Parceiro vê itens da própria clínica" ON itens_orcamento
  FOR SELECT USING (clinica_id = auth_clinica_id());
