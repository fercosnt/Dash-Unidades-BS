-- supabase/migrations/010_dentistas.sql
-- Tabela de dentistas vinculados a clínicas parceiras

CREATE TABLE dentistas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas_parceiras(id),
  nome       text NOT NULL,
  email      text,
  telefone   text,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Garante 1 dentista ativo por clínica
CREATE UNIQUE INDEX idx_dentistas_clinica_ativo
  ON dentistas (clinica_id) WHERE ativo = true;

ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_dentistas" ON dentistas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Adiciona dentista_id à tabela de comissões (nullable para compatibilidade)
ALTER TABLE comissoes_dentista
  ADD COLUMN dentista_id uuid REFERENCES dentistas(id);
