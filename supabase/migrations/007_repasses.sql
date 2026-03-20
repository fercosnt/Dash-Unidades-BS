-- supabase/migrations/007_repasses.sql

CREATE TABLE repasses_mensais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id     uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia text NOT NULL,           -- YYYY-MM
  valor_repasse  numeric(12,2) NOT NULL,
  data_transferencia date NOT NULL,
  observacao     text,
  status         text NOT NULL DEFAULT 'transferido',
  created_at     timestamptz DEFAULT now(),
  UNIQUE (clinica_id, mes_referencia)
);

-- RLS: only admin can access
ALTER TABLE repasses_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_repasses" ON repasses_mensais
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
