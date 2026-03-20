-- supabase/migrations/009_comissoes_dentista.sql

CREATE TABLE config_comissao_dentista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier1_limite     int NOT NULL DEFAULT 7,
  tier1_percentual numeric(5,2) NOT NULL DEFAULT 2.00,
  tier2_limite     int NOT NULL DEFAULT 12,
  tier2_percentual numeric(5,2) NOT NULL DEFAULT 2.50,
  tier3_percentual numeric(5,2) NOT NULL DEFAULT 3.00,
  vigencia_inicio  date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim     date,
  created_at       timestamptz DEFAULT now()
);

-- Insert default config
INSERT INTO config_comissao_dentista (tier1_limite, tier1_percentual, tier2_limite, tier2_percentual, tier3_percentual)
VALUES (7, 2.00, 12, 2.50, 3.00);

CREATE TABLE comissoes_dentista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id       uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia   text NOT NULL,
  qtde_vendas      int NOT NULL,
  tier_aplicado    int NOT NULL,
  percentual       numeric(5,2) NOT NULL,
  base_calculo     numeric(12,2) NOT NULL,
  valor_comissao   numeric(12,2) NOT NULL,
  status           text NOT NULL DEFAULT 'pendente',
  data_pagamento   date,
  observacao       text,
  config_id        uuid REFERENCES config_comissao_dentista(id),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (clinica_id, mes_referencia)
);

ALTER TABLE config_comissao_dentista ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_dentista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_config_comissao_dentista" ON config_comissao_dentista
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_comissoes_dentista" ON comissoes_dentista
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
