-- supabase/migrations/011_pagamentos_comissao_medicos.sql
-- Tabela de pagamentos de comissão para médicos indicadores

CREATE TABLE IF NOT EXISTS pagamentos_comissao (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_indicador_id  uuid NOT NULL REFERENCES medicos_indicadores(id),
  clinica_id           uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia       text NOT NULL,
  valor_comissao       numeric(10,2) NOT NULL,
  status               text NOT NULL DEFAULT 'pendente',
  data_pagamento       date,
  observacao           text,
  created_at           timestamptz DEFAULT now()
);

-- Constraint unique para upsert por medico+mes
ALTER TABLE pagamentos_comissao
  ADD CONSTRAINT pagamentos_comissao_medico_mes_unique
  UNIQUE (medico_indicador_id, mes_referencia);

ALTER TABLE pagamentos_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_pagamentos_comissao" ON pagamentos_comissao
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
