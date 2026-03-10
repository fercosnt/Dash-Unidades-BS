-- supabase/migrations/008_debito_parceiro.sql

CREATE TABLE debito_parceiro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas_parceiras(id),
  descricao   text NOT NULL,
  valor_total numeric(10,2) NOT NULL,
  valor_pago  numeric(10,2) NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  status      text NOT NULL DEFAULT 'ativo',   -- ativo | quitado
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE abatimentos_debito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debito_id      uuid NOT NULL REFERENCES debito_parceiro(id),
  mes_referencia text NOT NULL,        -- YYYY-MM
  valor_abatido  numeric(10,2) NOT NULL,
  repasse_id     uuid REFERENCES repasses_mensais(id),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE debito_parceiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE abatimentos_debito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_debito" ON debito_parceiro
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "parceiro_read_own_debito" ON debito_parceiro
  FOR SELECT TO authenticated
  USING (clinica_id = auth_clinica_id());

CREATE POLICY "admin_all_abatimentos" ON abatimentos_debito
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "parceiro_read_own_abatimentos" ON abatimentos_debito
  FOR SELECT TO authenticated
  USING (debito_id IN (
    SELECT id FROM debito_parceiro WHERE clinica_id = auth_clinica_id()
  ));
