-- ============================================================
-- Migration 017: Despesas Operacionais + Taxas Reais de Cartão
-- ============================================================
-- Adiciona módulo de despesas operacionais por unidade/mês,
-- categorias dinâmicas de despesa, e taxas reais de cartão
-- por modalidade/parcelas para cálculo do DRE da Beauty Smile.
-- ============================================================

-- 1. Tabela de categorias de despesa (dinâmica, gerenciada pelo admin)
CREATE TABLE categorias_despesa (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed das categorias iniciais
INSERT INTO categorias_despesa (nome) VALUES
  ('Imposto NF (Guias)'),
  ('Salário Dentista'),
  ('Insumos para Atendimento'),
  ('Extras Dentista'),
  ('Compra de Equipamentos e Instrumentais'),
  ('Assinatura Clinicorp'),
  ('Mensalidade Biologix'),
  ('Manutenção de Equipamentos'),
  ('Despesas de MKT');

-- 2. Tabela de despesas operacionais por clínica/mês
CREATE TABLE despesas_operacionais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id     uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia date NOT NULL,
  categoria_id   uuid NOT NULL REFERENCES categorias_despesa(id),
  descricao      text,
  valor          numeric(10,2) NOT NULL CHECK (valor > 0),
  recorrente     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_clinica_mes ON despesas_operacionais(clinica_id, mes_referencia);
CREATE INDEX idx_despesas_categoria ON despesas_operacionais(categoria_id);

-- 3. Tabela de taxas reais de cartão por modalidade/bandeira/parcelas
CREATE TABLE taxas_cartao_reais (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade          text NOT NULL CHECK (modalidade IN ('credito', 'debito')),
  bandeira            text NOT NULL DEFAULT 'visa_master' CHECK (bandeira IN ('visa_master', 'outros')),
  numero_parcelas     integer CHECK (numero_parcelas IS NULL OR (numero_parcelas >= 1 AND numero_parcelas <= 12)),
  taxa_percentual     numeric(5,4) NOT NULL DEFAULT 0 CHECK (taxa_percentual >= 0 AND taxa_percentual <= 100),
  vigencia_inicio     date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim        date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_taxa_modalidade_bandeira_parcelas_vigencia UNIQUE (modalidade, bandeira, numero_parcelas, vigencia_inicio)
);

-- Seed: Visa/Mastercard
INSERT INTO taxas_cartao_reais (modalidade, bandeira, numero_parcelas, taxa_percentual) VALUES
  ('debito',  'visa_master', NULL, 0.69),
  ('credito', 'visa_master', 1,  1.75),
  ('credito', 'visa_master', 2,  2.19),
  ('credito', 'visa_master', 3,  2.19),
  ('credito', 'visa_master', 4,  2.19),
  ('credito', 'visa_master', 5,  2.19),
  ('credito', 'visa_master', 6,  2.19),
  ('credito', 'visa_master', 7,  2.53),
  ('credito', 'visa_master', 8,  2.53),
  ('credito', 'visa_master', 9,  2.53),
  ('credito', 'visa_master', 10, 2.53),
  ('credito', 'visa_master', 11, 2.53),
  ('credito', 'visa_master', 12, 2.53);

-- Seed: Outros (Elo, Amex, Banescard, Sorocred, Diners, Cabal, JCB, Credz, Sicredi)
INSERT INTO taxas_cartao_reais (modalidade, bandeira, numero_parcelas, taxa_percentual) VALUES
  ('debito',  'outros', NULL, 1.49),
  ('credito', 'outros', 1,  2.55),
  ('credito', 'outros', 2,  2.99),
  ('credito', 'outros', 3,  2.99),
  ('credito', 'outros', 4,  2.99),
  ('credito', 'outros', 5,  2.99),
  ('credito', 'outros', 6,  2.99),
  ('credito', 'outros', 7,  3.33),
  ('credito', 'outros', 8,  3.33),
  ('credito', 'outros', 9,  3.33),
  ('credito', 'outros', 10, 3.33),
  ('credito', 'outros', 11, 3.33),
  ('credito', 'outros', 12, 3.33);

-- 4. Adicionar coluna bandeira na tabela pagamentos (NULL = visa_master por padrão)
ALTER TABLE pagamentos ADD COLUMN bandeira text CHECK (bandeira IS NULL OR bandeira IN ('visa_master', 'outros'));

-- ============================================================
-- RLS Policies
-- ============================================================

-- categorias_despesa
ALTER TABLE categorias_despesa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_categorias_despesa"
  ON categorias_despesa FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "anyone_read_categorias_despesa"
  ON categorias_despesa FOR SELECT TO authenticated
  USING (true);

-- despesas_operacionais
ALTER TABLE despesas_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_despesas_operacionais"
  ON despesas_operacionais FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "parceiro_read_own_despesas"
  ON despesas_operacionais FOR SELECT TO authenticated
  USING (clinica_id = auth_clinica_id());

-- taxas_cartao_reais
ALTER TABLE taxas_cartao_reais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_taxas_cartao_reais"
  ON taxas_cartao_reais FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "anyone_read_taxas_cartao_reais"
  ON taxas_cartao_reais FOR SELECT TO authenticated
  USING (true);
