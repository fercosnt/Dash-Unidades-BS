-- ============================================================
-- BEAUTY SMILE PARTNERS — 001: Schema completo
-- Idempotente: adiciona colunas faltantes em tabelas existentes
-- e cria demais objetos. Execute após o primeiro script mínimo
-- (profiles + clinicas_parceiras já existentes).
-- ============================================================

-- 0. Função genérica updated_at (necessária para os triggers abaixo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funções para RLS (usadas em 002_rls_policies.sql)
CREATE OR REPLACE FUNCTION public.auth_clinica_id()
RETURNS uuid AS $$
  SELECT clinica_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Colunas faltantes em clinicas_parceiras (se já existir)
-- ============================================================
ALTER TABLE clinicas_parceiras ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE clinicas_parceiras ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clinicas_parceiras ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE clinicas_parceiras ADD COLUMN IF NOT EXISTS custo_mao_de_obra DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE clinicas_parceiras ADD COLUMN IF NOT EXISTS percentual_split DECIMAL(5,2) NOT NULL DEFAULT 40.00;

-- 2. Colunas faltantes em profiles (se já existir)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- Trigger updated_at em profiles (se não existir)
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. ENUMs
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_planilha AS ENUM ('orcamentos_fechados', 'orcamentos_abertos', 'tratamentos_executados', 'recebimentos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_upload AS ENUM ('processando', 'concluido', 'erro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_orcamento AS ENUM ('em_aberto', 'parcial', 'quitado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE forma_pagamento AS ENUM ('cartao_credito', 'cartao_debito', 'pix', 'dinheiro', 'boleto', 'transferencia');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_parcela AS ENUM ('projetado', 'recebido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_resumo AS ENUM ('processado', 'revisao');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Tabelas de configuração (criar se não existirem)
-- ============================================================
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_clinicorp TEXT,
  custo_fixo DECIMAL(12,2) NOT NULL DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuracoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxa_cartao_percentual DECIMAL(5,2) NOT NULL,
  imposto_nf_percentual DECIMAL(5,2) NOT NULL,
  percentual_beauty_smile DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medicos_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  percentual_comissao DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_medicos_updated_at ON medicos_indicadores;
CREATE TRIGGER tr_medicos_updated_at
  BEFORE UPDATE ON medicos_indicadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Controle de upload
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia DATE NOT NULL,
  tipo tipo_planilha NOT NULL,
  arquivo_nome TEXT,
  total_registros INTEGER DEFAULT 0,
  status status_upload NOT NULL DEFAULT 'processando',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, mes_referencia, tipo)
);

-- 6. Dados brutos
-- ============================================================
CREATE TABLE IF NOT EXISTS orcamentos_fechados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia DATE NOT NULL,
  paciente_nome TEXT NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  valor_pago DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_em_aberto DECIMAL(12,2) GENERATED ALWAYS AS (valor_total - valor_pago) STORED,
  status status_orcamento NOT NULL DEFAULT 'em_aberto',
  medico_indicador_id UUID REFERENCES medicos_indicadores(id),
  data_fechamento DATE,
  upload_batch_id UUID REFERENCES upload_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orcamentos_abertos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia DATE NOT NULL,
  paciente_nome TEXT NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'aberto',
  data_criacao DATE,
  upload_batch_id UUID REFERENCES upload_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tratamentos_executados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia DATE NOT NULL,
  paciente_nome TEXT NOT NULL,
  procedimento_id UUID REFERENCES procedimentos(id),
  procedimento_nome TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_execucao DATE,
  upload_batch_id UUID REFERENCES upload_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Pagamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_fechado_id UUID NOT NULL REFERENCES orcamentos_fechados(id),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  valor DECIMAL(12,2) NOT NULL,
  forma forma_pagamento NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  data_pagamento DATE NOT NULL,
  registrado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parcelas_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id UUID NOT NULL REFERENCES pagamentos(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  parcela_numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  valor_parcela DECIMAL(12,2) NOT NULL,
  mes_recebimento DATE NOT NULL,
  status status_parcela NOT NULL DEFAULT 'projetado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Resumo mensal
-- ============================================================
CREATE TABLE IF NOT EXISTS resumo_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia DATE NOT NULL,
  faturamento_bruto DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_custos_procedimentos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_custo_mao_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_taxa_cartao DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_imposto_nf DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_comissoes_medicas DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_liquido DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_beauty_smile DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_clinica DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_recebido_mes DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_a_receber_mes DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_inadimplente DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_recebimentos_futuros DECIMAL(12,2) NOT NULL DEFAULT 0,
  status status_resumo NOT NULL DEFAULT 'processado',
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  recalculado_em TIMESTAMPTZ,
  UNIQUE(clinica_id, mes_referencia)
);

-- 9. Trigger status orçamento
-- ============================================================
CREATE OR REPLACE FUNCTION update_orcamento_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valor_pago >= NEW.valor_total THEN
    NEW.status = 'quitado';
  ELSIF NEW.valor_pago > 0 THEN
    NEW.status = 'parcial';
  ELSE
    NEW.status = 'em_aberto';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_orcamento_status ON orcamentos_fechados;
CREATE TRIGGER tr_orcamento_status
  BEFORE UPDATE OF valor_pago ON orcamentos_fechados
  FOR EACH ROW EXECUTE FUNCTION update_orcamento_status();

-- 10. Views
-- ============================================================
CREATE OR REPLACE VIEW vw_inadimplentes AS
SELECT
  of.paciente_nome,
  of.clinica_id,
  cp.nome AS clinica_nome,
  of.valor_total,
  of.valor_pago,
  of.valor_em_aberto,
  of.data_fechamento,
  of.status,
  EXTRACT(DAY FROM (now() - (of.data_fechamento || ' 00:00:00')::timestamptz))::integer AS dias_em_aberto
FROM orcamentos_fechados of
JOIN clinicas_parceiras cp ON cp.id = of.clinica_id
WHERE of.valor_em_aberto > 0
  AND of.status IN ('em_aberto', 'parcial')
ORDER BY of.valor_em_aberto DESC;

CREATE OR REPLACE VIEW vw_recebimentos_futuros AS
SELECT
  pc.clinica_id,
  cp.nome AS clinica_nome,
  pc.mes_recebimento,
  SUM(pc.valor_parcela) AS total_projetado,
  COUNT(*) AS total_parcelas
FROM parcelas_cartao pc
JOIN clinicas_parceiras cp ON cp.id = pc.clinica_id
WHERE pc.status = 'projetado'
GROUP BY pc.clinica_id, cp.nome, pc.mes_recebimento
ORDER BY pc.mes_recebimento;

-- 11. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orcamentos_fechados_clinica_mes ON orcamentos_fechados(clinica_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_orcamentos_fechados_status ON orcamentos_fechados(status) WHERE status != 'quitado';
CREATE INDEX IF NOT EXISTS idx_orcamentos_abertos_clinica_mes ON orcamentos_abertos(clinica_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_tratamentos_clinica_mes ON tratamentos_executados(clinica_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_orcamento ON pagamentos(orcamento_fechado_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_mes_status ON parcelas_cartao(mes_recebimento, status);
CREATE INDEX IF NOT EXISTS idx_resumo_clinica_mes ON resumo_mensal(clinica_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_upload_clinica_mes_tipo ON upload_batches(clinica_id, mes_referencia, tipo);
