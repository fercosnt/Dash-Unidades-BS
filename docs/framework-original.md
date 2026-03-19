# Framework do Sistema: Beauty Smile Partners Dashboard

## Resumo Executivo

O Beauty Smile Partners Dashboard é um sistema web para gestão financeira das clínicas parceiras da Beauty Smile. Ele centraliza o controle de orçamentos, tratamentos, pagamentos e a divisão financeira mensal entre a Beauty Smile e suas clínicas parceiras.

**Problema que resolve**: Hoje o processo de fechamento mensal é manual — envolve múltiplas planilhas do Clinicorp, cálculos em Excel, e envio de relatórios por email. Isso consome tempo, gera erros e dificulta a visibilidade financeira tanto para a Beauty Smile quanto para os parceiros.

**Solução**: Um dashboard multi-tenant onde a Beauty Smile faz upload das planilhas mensais, o sistema processa automaticamente os cálculos financeiros (custos, impostos, taxas, comissões e split 60/40), e cada clínica parceira tem acesso ao seu próprio painel com visibilidade total dos seus números.

**Principais entregas**:

- Upload e processamento automático de 4 tipos de planilhas mensais por clínica
- Cálculo automático do split financeiro (60% Beauty Smile / 40% Clínica)
- Dashboard com visão geral e drill-down por clínica
- Controle de pagamentos com projeção de recebimentos futuros (parcelas de cartão)
- Módulo de inadimplência com visão de pacientes devedores
- Acesso restrito por clínica parceira (cada uma vê apenas seus dados)

**Escala inicial**: 1-3 clínicas parceiras, 2-3 usuários Beauty Smile + 1 login por clínica parceira.

**Custo operacional estimado**: R$ 0-110/mês.

---

## 1. Arquitetura Técnica

### 1.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                        │
│                     Next.js 14+ App Router                      │
│              @beautysmile/design-system (Admin Theme)            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Upload   │ │Dashboard │ │Financeiro│ │  Inadimplência    │  │
│  │Planilhas  │ │  Geral   │ │  Mensal  │ │  & Pagamentos     │  │
│  └─────┬─────┘ └─────┬────┘ └────┬─────┘ └────────┬──────────┘  │
│        │             │           │                 │             │
└────────┼─────────────┼───────────┼─────────────────┼─────────────┘
         │             │           │                 │
         ▼             ▼           ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │   Auth   │  │   RLS    │  │PostgreSQL│  │   Realtime    │   │
│  │(Email+PW)│  │(Multi-   │  │  (Dados) │  │  (Opcional)   │   │
│  │          │  │ tenant)  │  │          │  │               │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    n8n (Self-hosted Hostinger)                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  WF1: Upload │  │ WF2: Cálculo │  │WF3: Auto-recebim. │    │
│  │ Processamento│  │Resumo Mensal │  │ Parcelas Cartão    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │             WF4: Notificações Telegram                 │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router) | SSR para performance, API Routes para webhooks, ecossistema React maduro |
| **UI/Design** | @beautysmile/design-system (Admin Theme - Deep Blue #0A2463) | Componentes prontos (26+), templates Admin (Login, Dashboard, CRUD, List, Detail, Settings), glass morphism, TypeScript |
| **Auth** | Supabase Auth (Email + Password) | Integração nativa com RLS, gestão de usuários simples, zero custo adicional |
| **Multi-tenancy** | Supabase Row Level Security (RLS) | Isolamento de dados por clínica no nível do banco — zero código extra no frontend |
| **Banco de Dados** | Supabase PostgreSQL | Views SQL para relatórios, functions para cálculos, tipagem forte, backup automático |
| **Processamento** | n8n (self-hosted Hostinger) | Sem limite de execução, retry automático, logs visuais, notificações integradas |
| **Deploy** | Vercel | Zero config, preview deploys por PR, edge network global, free tier generoso |
| **Notificações** | Telegram via n8n | Já utilizado no dia-a-dia, integração simples |
| **Dev Tools** | Cursor + Claude Code | Desenvolvimento acelerado com AI |

### 1.3 Componentes Principais

**1. Módulo de Upload (Next.js + n8n)**
Responsável pela ingestão de dados das planilhas do Clinicorp. O frontend faz parse do XLSX com SheetJS no browser (preview para o usuário), e após confirmação envia os dados para uma tabela staging no Supabase. O n8n detecta os novos dados via webhook, valida, transforma e insere nas tabelas definitivas.

**2. Motor de Cálculo Financeiro (n8n)**
Workflow dedicado que cruza orçamentos fechados, tratamentos executados, custos de procedimentos, mão de obra por clínica, taxas e impostos para gerar o resumo mensal com o split 60/40. Materializa os resultados em tabela `resumo_mensal` para consulta rápida no dashboard.

**3. Dashboard Multi-tenant (Next.js + Supabase RLS)**
Interface web com duas visões: admin (Beauty Smile vê tudo) e parceiro (clínica vê só seus dados). O RLS do Supabase garante isolamento automático — o frontend faz queries normais e o banco filtra por `clinica_id` do usuário logado.

**4. Controle de Pagamentos (Next.js CRUD)**
Módulo operacional onde a Beauty Smile registra pagamentos recebidos dos pacientes, gerando automaticamente parcelas projetadas para cartão de crédito. Permite dar baixa manual em pagamentos e mantém visão de inadimplência.

**5. Projeção de Recebimentos (SQL Views + n8n)**
Views SQL que agregam parcelas de cartão projetadas por mês futuro, dando visibilidade de fluxo de caixa. O n8n roda cron diário para auto-atualizar status de parcelas de cartão quando o mês de recebimento chega.

---

## 2. Fluxos de Dados

### 2.1 Fluxo Principal: Upload Mensal e Processamento

```
PASSO 1 — Upload (Frontend)
┌─────────────────────────────────────────────┐
│ Usuário BS seleciona:                       │
│ • Clínica parceira                          │
│ • Mês de referência                         │
│ • Tipo: Orçamentos Fechados                 │
│ • Arquivo: planilha.xlsx                    │
│                                             │
│ SheetJS faz parse no browser                │
│ → Mostra preview dos dados em tabela        │
│ → Usuário confere e confirma                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
PASSO 2 — Staging (Supabase)
┌─────────────────────────────────────────────┐
│ Dados enviados como JSON para:              │
│ • Tabela staging (dados temporários)        │
│ • Registro em upload_batches (controle)     │
│   status: "processando"                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
PASSO 3 — Processamento (n8n Workflow 1)
┌─────────────────────────────────────────────┐
│ Trigger: Webhook do frontend                │
│                                             │
│ 1. Valida campos obrigatórios              │
│ 2. Verifica duplicidade (mês/clínica/tipo)  │
│ 3. Transforma dados para schema definitivo  │
│ 4. Insere na tabela correspondente          │
│ 5. Se orçamento fechado: status "em_aberto" │
│ 6. Atualiza upload_batch: "concluído"       │
│ 7. Limpa staging                            │
│ 8. Notifica Telegram ✅                     │
└─────────────────────────────────────────────┘
```

Esse fluxo se repete 4 vezes por clínica/mês (uma para cada tipo de planilha):
1. Orçamentos Fechados
2. Orçamentos Abertos
3. Tratamentos Executados
4. Recebimentos (pagamentos já realizados no Clinicorp)

### 2.2 Fluxo de Cálculo do Resumo Mensal

```
TRIGGER: Manual (botão "Calcular Resumo") ou automático (após 4 uploads completos)

ENTRADA (dados do mês M, clínica C):
├── orçamentos_fechados     → Faturamento Bruto
├── tratamentos_executados  → Cruzar com tabela procedimentos → Custos
├── pagamentos registrados  → Parcelas cartão projetadas
├── clinica.custo_mao_obra  → Custo mão de obra
└── config_financeiras      → Taxa cartão %, Imposto NF %

CÁLCULO:
  a. Faturamento Bruto         = Σ valor_total dos orçamentos fechados
  b. Custos Procedimentos      = Σ (qtd_tratamento × custo_fixo_procedimento)
  c. Custo Mão de Obra         = clinica.custo_mao_de_obra (fixo mensal)
  d. Taxa Cartão               = faturamento_bruto × taxa_cartao%
  e. Imposto NF                = faturamento_bruto × imposto_nf%
  f. Comissões Médicos         = Σ (orçamentos com médico indicador × 10%)
  g. Valor Líquido             = a - b - c - d - e - f
  h. Parte Beauty Smile (60%)  = g × 0.60
  i. Parte Clínica (40%)       = g × 0.40

SAÍDA:
  → Upsert em resumo_mensal (cria ou atualiza se já existia)
  → Notifica Telegram com resumo formatado
```

### 2.3 Fluxo de Registro de Pagamento (Operacional)

```
Tela: Orçamentos Fechados → Paciente "Maria" → R$10.000 (saldo em aberto: R$10.000)

[Botão "Registrar Pagamento"]
  ↓
Modal:
  • Valor: R$6.000
  • Forma: Cartão Crédito
  • Parcelas: 6x
  • Data: 10/03/2026
  ↓
Sistema processa:
  1. Cria registro em "pagamentos" (R$6.000, cartão, 6x)
  2. Gera 6 registros em "parcelas_cartao":
     ├── 1/6 — R$1.000 — Abr/2026 — projetado
     ├── 2/6 — R$1.000 — Mai/2026 — projetado
     ├── 3/6 — R$1.000 — Jun/2026 — projetado
     ├── 4/6 — R$1.000 — Jul/2026 — projetado
     ├── 5/6 — R$1.000 — Ago/2026 — projetado
     └── 6/6 — R$1.000 — Set/2026 — projetado
  3. Atualiza orçamento:
     • valor_pago: R$6.000
     • valor_em_aberto: R$4.000
     • status: "parcial"
  ↓
Dashboard atualiza:
  • Recebimentos futuros: +R$6.000 distribuídos nos próximos 6 meses
  • Inadimplência: Maria ainda deve R$4.000
```

### 2.4 Fluxo de Auto-recebimento de Parcelas de Cartão

```
TRIGGER: Cron diário 00:01 (n8n Workflow 3)

1. Busca parcelas_cartao WHERE:
   • mes_recebimento <= mês atual
   • status = 'projetado'

2. Atualiza status → 'recebido'

3. Log de parcelas atualizadas

Lógica: Cartão parcelado é receita garantida pela operadora.
Quando o mês chega, a parcela é automaticamente marcada como recebida.
```

---

## 3. Modelo de Dados

### 3.1 Diagrama de Relacionamentos

```
┌───────────────────┐       ┌───────────────────────┐
│ clinicas_parceiras│──┐    │  configuracoes_        │
│                   │  │    │  financeiras            │
│ • id (PK)         │  │    │                         │
│ • nome            │  │    │ • taxa_cartao_%         │
│ • cnpj            │  │    │ • imposto_nf_%          │
│ • custo_mao_obra  │  │    │ • percentual_bs (60%)   │
│ • percentual_split│  │    │ • vigencia_inicio/fim   │
└───────┬───────────┘  │    └─────────────────────────┘
        │              │
        │    ┌─────────┴────────────┐
        │    │                      │
        ▼    ▼                      ▼
┌──────────────────┐    ┌───────────────────────┐
│ medicos_         │    │ profiles (users)       │
│ indicadores      │    │                        │
│                  │    │ • id (FK Supabase Auth)│
│ • id (PK)        │    │ • role (admin/parceiro)│
│ • nome           │    │ • clinica_id (FK)      │
│ • clinica_id(FK) │    └───────────────────────┘
│ • comissao_%     │
└────────┬─────────┘
         │
         │ (nullable FK)
         ▼
┌──────────────────────────────────────────────────┐
│                DADOS BRUTOS (upload mensal)       │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │orcamentos_       │  │orcamentos_abertos    │  │
│  │fechados           │  │                      │  │
│  │                   │  │• clinica_id (FK)     │  │
│  │• clinica_id (FK)  │  │• valor_total         │  │
│  │• paciente_nome    │  │• status              │  │
│  │• valor_total      │  │• mes_referencia      │  │
│  │• valor_pago       │  └──────────────────────┘  │
│  │• valor_em_aberto  │                            │
│  │• status           │  ┌──────────────────────┐  │
│  │• medico_ind_id(FK)│  │tratamentos_executados│  │
│  │• upload_batch_id  │  │                      │  │
│  └────────┬──────────┘  │• clinica_id (FK)     │  │
│           │             │• procedimento_id(FK) │  │
│           │             │• quantidade          │  │
│           ▼             └──────────────────────┘  │
│  ┌──────────────────┐                             │
│  │ pagamentos       │  ┌──────────────────────┐   │
│  │                  │  │ procedimentos        │   │
│  │• orcamento_id(FK)│  │ (tabela única)       │   │
│  │• valor           │  │                      │   │
│  │• forma_pagamento │  │• nome                │   │
│  │• parcelas        │  │• custo_fixo          │   │
│  └────────┬─────────┘  │• categoria           │   │
│           │             └──────────────────────┘   │
│           ▼                                        │
│  ┌──────────────────┐                              │
│  │ parcelas_cartao  │                              │
│  │                  │                              │
│  │• pagamento_id(FK)│                              │
│  │• parcela_numero  │                              │
│  │• valor_parcela   │                              │
│  │• mes_recebimento │                              │
│  │• status          │                              │
│  └──────────────────┘                              │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│              DADOS CALCULADOS                     │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ resumo_mensal                            │    │
│  │                                          │    │
│  │ • clinica_id + mes_referencia (unique)   │    │
│  │ • faturamento_bruto                      │    │
│  │ • total_custos_procedimentos             │    │
│  │ • total_custo_mao_obra                   │    │
│  │ • total_taxa_cartao                      │    │
│  │ • total_imposto_nf                       │    │
│  │ • total_comissoes_medicas                │    │
│  │ • valor_liquido                          │    │
│  │ • valor_beauty_smile (60%)               │    │
│  │ • valor_clinica (40%)                    │    │
│  │ • total_recebido_mes                     │    │
│  │ • total_a_receber_mes                    │    │
│  │ • total_inadimplente                     │    │
│  │ • total_recebimentos_futuros             │    │
│  │ • status (processado/revisao)            │    │
│  │ • calculado_em / recalculado_em          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ upload_batches (controle de importação)  │    │
│  │                                          │    │
│  │ • clinica_id + mes + tipo (tracking)     │    │
│  │ • arquivo_nome, total_registros          │    │
│  │ • status (processando/concluido/erro)    │    │
│  │ • uploaded_by (user_id)                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ vw_inadimplentes (VIEW SQL)              │    │
│  │                                          │    │
│  │ Agrega orçamentos com valor_em_aberto >0 │    │
│  │ por paciente e clínica                   │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 3.2 Schema SQL Completo

```sql
-- ============================================================
-- BEAUTY SMILE PARTNERS DASHBOARD — SCHEMA SQL
-- Supabase PostgreSQL
-- ============================================================

-- 1. TABELAS DE CONFIGURAÇÃO
-- ============================================================

CREATE TABLE clinicas_parceiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    responsavel TEXT,
    email TEXT,
    telefone TEXT,
    custo_mao_de_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
    percentual_split DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    ativa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE procedimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo_clinicorp TEXT,
    custo_fixo DECIMAL(12,2) NOT NULL DEFAULT 0,
    categoria TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE medicos_indicadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
    percentual_comissao DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuracoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxa_cartao_percentual DECIMAL(5,2) NOT NULL,
    imposto_nf_percentual DECIMAL(5,2) NOT NULL,
    percentual_beauty_smile DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE PERFIS (extensão do Supabase Auth)
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'parceiro')),
    clinica_id UUID REFERENCES clinicas_parceiras(id),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CONTROLE DE UPLOAD
-- ============================================================

CREATE TYPE tipo_planilha AS ENUM (
    'orcamentos_fechados',
    'orcamentos_abertos',
    'tratamentos_executados',
    'recebimentos'
);

CREATE TYPE status_upload AS ENUM (
    'processando',
    'concluido',
    'erro'
);

CREATE TABLE upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
    mes_referencia DATE NOT NULL, -- sempre primeiro dia do mês (2026-03-01)
    tipo tipo_planilha NOT NULL,
    arquivo_nome TEXT,
    total_registros INTEGER DEFAULT 0,
    status status_upload NOT NULL DEFAULT 'processando',
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(clinica_id, mes_referencia, tipo)
);

-- 4. DADOS BRUTOS (upload mensal)
-- ============================================================

CREATE TYPE status_orcamento AS ENUM (
    'em_aberto',
    'parcial',
    'quitado'
);

CREATE TABLE orcamentos_fechados (
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

CREATE TABLE orcamentos_abertos (
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

CREATE TABLE tratamentos_executados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
    mes_referencia DATE NOT NULL,
    paciente_nome TEXT NOT NULL,
    procedimento_id UUID REFERENCES procedimentos(id),
    procedimento_nome TEXT, -- fallback se não casar com tabela procedimentos
    quantidade INTEGER NOT NULL DEFAULT 1,
    data_execucao DATE,
    upload_batch_id UUID REFERENCES upload_batches(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CONTROLE DE PAGAMENTOS
-- ============================================================

CREATE TYPE forma_pagamento AS ENUM (
    'cartao_credito',
    'cartao_debito',
    'pix',
    'dinheiro',
    'boleto',
    'transferencia'
);

CREATE TABLE pagamentos (
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

CREATE TYPE status_parcela AS ENUM (
    'projetado',
    'recebido'
);

CREATE TABLE parcelas_cartao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagamento_id UUID NOT NULL REFERENCES pagamentos(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
    parcela_numero INTEGER NOT NULL,
    total_parcelas INTEGER NOT NULL,
    valor_parcela DECIMAL(12,2) NOT NULL,
    mes_recebimento DATE NOT NULL, -- primeiro dia do mês de recebimento
    status status_parcela NOT NULL DEFAULT 'projetado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DADOS CALCULADOS
-- ============================================================

CREATE TYPE status_resumo AS ENUM (
    'processado',
    'revisao'
);

CREATE TABLE resumo_mensal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id),
    mes_referencia DATE NOT NULL,
    
    -- Faturamento
    faturamento_bruto DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Deduções
    total_custos_procedimentos DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_custo_mao_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_taxa_cartao DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_imposto_nf DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_comissoes_medicas DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Resultado
    valor_liquido DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_beauty_smile DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_clinica DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Recebimentos
    total_recebido_mes DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_a_receber_mes DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_inadimplente DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_recebimentos_futuros DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Controle
    status status_resumo NOT NULL DEFAULT 'processado',
    calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    recalculado_em TIMESTAMPTZ,
    
    UNIQUE(clinica_id, mes_referencia)
);

-- 7. VIEWS
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
    -- Dias desde o fechamento do orçamento
    EXTRACT(DAY FROM now() - of.data_fechamento::timestamptz)::integer AS dias_em_aberto
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

-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE orcamentos_fechados ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos_abertos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamentos_executados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumo_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos_indicadores ENABLE ROW LEVEL SECURITY;

-- Policy template: admin vê tudo, parceiro vê só sua clínica
CREATE OR REPLACE FUNCTION auth_clinica_id()
RETURNS UUID AS $$
    SELECT clinica_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT role = 'admin' FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Aplicar em todas as tabelas com clinica_id
-- Exemplo para orcamentos_fechados (replicar para as demais):

CREATE POLICY "admin_full_access" ON orcamentos_fechados
    FOR ALL USING (is_admin());

CREATE POLICY "parceiro_read_own" ON orcamentos_fechados
    FOR SELECT USING (clinica_id = auth_clinica_id());

-- Repetir padrão para: orcamentos_abertos, tratamentos_executados,
-- pagamentos, parcelas_cartao, resumo_mensal, upload_batches, medicos_indicadores

-- 9. INDEXES
-- ============================================================

CREATE INDEX idx_orcamentos_fechados_clinica_mes 
    ON orcamentos_fechados(clinica_id, mes_referencia);
CREATE INDEX idx_orcamentos_fechados_status 
    ON orcamentos_fechados(status) WHERE status != 'quitado';
CREATE INDEX idx_orcamentos_abertos_clinica_mes 
    ON orcamentos_abertos(clinica_id, mes_referencia);
CREATE INDEX idx_tratamentos_clinica_mes 
    ON tratamentos_executados(clinica_id, mes_referencia);
CREATE INDEX idx_pagamentos_orcamento 
    ON pagamentos(orcamento_fechado_id);
CREATE INDEX idx_parcelas_mes_status 
    ON parcelas_cartao(mes_recebimento, status);
CREATE INDEX idx_resumo_clinica_mes 
    ON resumo_mensal(clinica_id, mes_referencia);
CREATE INDEX idx_upload_clinica_mes_tipo 
    ON upload_batches(clinica_id, mes_referencia, tipo);

-- 10. TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clinicas_updated_at
    BEFORE UPDATE ON clinicas_parceiras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update status do orçamento quando valor_pago muda
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

CREATE TRIGGER tr_orcamento_status
    BEFORE UPDATE OF valor_pago ON orcamentos_fechados
    FOR EACH ROW EXECUTE FUNCTION update_orcamento_status();
```

---

## 4. Integrações e APIs

### 4.1 API Routes (Next.js)

| Rota | Método | Descrição | Auth |
|------|--------|-----------|------|
| `/api/upload/preview` | POST | Recebe XLSX, retorna JSON para preview | admin |
| `/api/upload/confirm` | POST | Envia dados confirmados para staging + trigger n8n | admin |
| `/api/pagamentos` | POST | Registra pagamento + gera parcelas cartão | admin |
| `/api/pagamentos/[id]` | DELETE | Estorna pagamento + remove parcelas | admin |
| `/api/resumo/calcular` | POST | Trigger manual do cálculo de resumo mensal via n8n | admin |
| `/api/resumo/recalcular` | POST | Recalcula resumo existente (corrigir erros) | admin |

### 4.2 Webhooks n8n

| Webhook | Trigger | Ação |
|---------|---------|------|
| `/webhook/upload-process` | POST do frontend após confirmação | Workflow 1: Processamento de Upload |
| `/webhook/calcular-resumo` | POST do frontend ou auto após 4 uploads | Workflow 2: Cálculo Resumo Mensal |

### 4.3 Cron Jobs n8n

| Schedule | Workflow | Ação |
|----------|----------|------|
| `0 0 * * *` (diário 00:01) | WF3: Auto-recebimento | Marca parcelas de cartão como recebidas quando mês chega |

### 4.4 Notificações Telegram

| Evento | Mensagem |
|--------|----------|
| Upload processado | ✅ Upload processado: [tipo] - [clínica] - [mês] - [N registros] |
| Resumo calculado | 📊 Resumo [mês] - [clínica]: Faturamento R$X / Líquido R$Y / BS R$Z / Clínica R$W |
| Erro no processamento | ❌ Erro no upload: [tipo] - [clínica] - [mês]: [descrição do erro] |
| Parcelas auto-atualizadas | 🔄 [N] parcelas de cartão marcadas como recebidas em [mês] |

---

## 5. Segurança e Compliance

### 5.1 Autenticação

- **Método**: Email + Senha via Supabase Auth
- **Gestão de contas**: Admin Beauty Smile cria contas de parceiros manualmente via painel de Configurações
- **Sem self-service**: Parceiros não se cadastram sozinhos
- **Sessão**: JWT gerenciado pelo Supabase (refresh automático)

### 5.2 Autorização (Multi-tenancy via RLS)

- **Row Level Security** ativado em todas as tabelas com `clinica_id`
- **Admin** (role = 'admin'): acesso total a todos os dados e funcionalidades
- **Parceiro** (role = 'parceiro'): acesso somente leitura aos dados da sua clínica
- **Isolamento garantido no banco**: mesmo se o frontend tiver bug, o RLS impede acesso indevido

### 5.3 Proteção de Dados

- Dados financeiros sensíveis armazenados apenas no Supabase (PostgreSQL com criptografia em repouso)
- Comunicação HTTPS em todas as camadas (Vercel, Supabase, n8n)
- Planilhas XLSX processadas e descartadas — apenas dados estruturados persistem
- Sem armazenamento de dados de cartão de crédito (só forma de pagamento e parcelas)

### 5.4 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Upload de planilha com dados errados | Cálculos financeiros incorretos | Preview obrigatório antes de confirmar + possibilidade de recalcular resumo |
| Acesso indevido a dados de outra clínica | Vazamento de informação financeira | RLS no banco + testes automatizados de isolamento |
| n8n fora do ar durante upload | Dados ficam na staging sem processar | Retry automático + alerta Telegram + botão de reprocessar |
| Perda de dados | Impacto financeiro | Backup automático Supabase + upload_batches como auditoria |

---

## 6. Escalabilidade e Performance

### 6.1 Capacidade Atual (1-3 clínicas)

- **Volume estimado**: ~50-200 orçamentos/mês por clínica, ~100-500 tratamentos/mês
- **Usuários simultâneos**: 2-5 máximo
- **Supabase Free Tier**: 500MB storage, 2GB bandwidth — suficiente para anos nesse volume
- **Performance esperada**: Dashboard carrega <1s (leitura de `resumo_mensal` pré-calculado)

### 6.2 Pontos de Escala (se crescer para 10+ clínicas)

| Componente | Limite Atual | Ação quando atingir |
|-----------|-------------|---------------------|
| Supabase Free | 500MB storage | Upgrade para Pro ($25/mês) — 8GB |
| Vercel Free | 100GB bandwidth | Upgrade para Pro ($20/mês) |
| n8n Hostinger | Depende do plano | Monitorar uso de CPU/RAM |
| Cálculo resumo mensal | Complexidade cresce linearmente | Pode paralelizar por clínica no n8n |

### 6.3 Design para Performance

- **Resumo pré-calculado**: Dashboard lê tabela materializada, não faz cálculos em tempo real
- **Views SQL**: Inadimplência e recebimentos futuros como views (PostgreSQL otimiza automaticamente)
- **Indexes**: Criados nas combinações mais consultadas (clinica_id + mes_referencia)
- **Generated columns**: `valor_em_aberto` calculado pelo PostgreSQL (não pela aplicação)

---

## 7. Estimativas

### 7.1 Custos (MVP / Produção)

| Item | MVP (1-3 clínicas) | Produção (4-10 clínicas) |
|------|---------------------|--------------------------|
| Supabase | R$ 0 (Free Tier) | R$ 130/mês (Pro) |
| Vercel | R$ 0 (Free/Hobby) | R$ 110/mês (Pro) |
| n8n | R$ 0 (self-hosted Hostinger) | R$ 0 (mesmo server) |
| Domínio (se quiser) | R$ 50/ano | R$ 50/ano |
| **Total mensal** | **R$ 0-5** | **R$ 240-245** |

### 7.2 Timeline de Implementação

| Fase | Duração | Entregas |
|------|---------|----------|
| **Fase 1: Fundação** | 1 semana | Setup Supabase (schema, RLS, auth), setup Next.js com design system, login admin + parceiro |
| **Fase 2: Upload & Processamento** | 1-2 semanas | Upload XLSX com preview, workflows n8n (processamento + validação), tabela staging → dados definitivos |
| **Fase 3: Dashboard & Financeiro** | 1-2 semanas | Dashboard admin (KPIs, gráficos, drill-down por clínica), cálculo de resumo mensal (n8n), dashboard parceiro (visão restrita) |
| **Fase 4: Pagamentos & Inadimplência** | 1 semana | Registro de pagamento, geração de parcelas cartão, auto-recebimento (cron n8n), tela de inadimplentes |
| **Fase 5: Polish & Deploy** | 1 semana | Testes E2E, ajustes de UX, deploy Vercel (produção), documentação de uso |
| **Total estimado** | **5-7 semanas** | |

### 7.3 Recursos Necessários

- **Desenvolvimento**: Fernando (full-stack) com Cursor + Claude Code
- **Dados**: Acesso às planilhas modelo do Clinicorp (para mapear colunas)
- **Validação**: Gerente financeiro Beauty Smile para validar cálculos
- **Infra**: Supabase (criar projeto), Vercel (criar projeto), n8n (já disponível)

---

## 8. Roadmap de Implementação

### Fase 1: Fundação (Semana 1)

```
□ Criar projeto Supabase
□ Executar schema SQL completo
□ Configurar RLS policies
□ Setup Next.js 14 com @beautysmile/design-system (Admin template)
□ Implementar login (Supabase Auth)
□ Criar layout base (sidebar, header, routing)
□ Tela de configurações: CRUD clínicas parceiras
□ Tela de configurações: CRUD procedimentos
□ Tela de configurações: CRUD médicos indicadores
□ Tela de configurações: parâmetros financeiros
□ Criar primeiro usuário admin + primeiro parceiro de teste
```

### Fase 2: Upload & Processamento (Semanas 2-3)

```
□ Componente de upload XLSX (SheetJS parse no browser)
□ Tela de preview com tabela editável
□ API Route para enviar dados confirmados ao staging
□ n8n Workflow 1: Processamento de upload
  □ Webhook trigger
  □ Validação de campos
  □ Verificação de duplicidade
  □ Inserção nas tabelas definitivas
  □ Atualização de upload_batches
  □ Notificação Telegram
□ Tela de histórico de uploads
□ Mapear colunas das 4 planilhas do Clinicorp → schema do banco
```

### Fase 3: Dashboard & Financeiro (Semanas 3-4)

```
□ Dashboard admin — Home:
  □ Cards KPIs (faturamento, recebido, a receber, inadimplência)
  □ Gráfico faturamento vs recebimento (últimos 12 meses)
  □ Ranking clínicas
□ Dashboard admin — Drill-down por clínica:
  □ Lista orçamentos fechados + status
  □ Lista orçamentos abertos (pipeline)
  □ Tratamentos executados no mês
  □ Resumo financeiro detalhado (split)
□ n8n Workflow 2: Cálculo resumo mensal
  □ Cruzamento de todas as tabelas
  □ Aplicação das regras de cálculo
  □ Upsert em resumo_mensal
  □ Notificação Telegram
□ Dashboard parceiro:
  □ Home com KPIs (só dados da clínica)
  □ Orçamentos (fechados + abertos)
  □ Financeiro (resumo mensal + histórico)
```

### Fase 4: Pagamentos & Inadimplência (Semana 5)

```
□ Tela de registro de pagamento (modal):
  □ Selecionar forma de pagamento
  □ Valor e número de parcelas
  □ Geração automática de parcelas_cartao
  □ Atualização de valor_pago no orçamento
□ n8n Workflow 3: Auto-recebimento parcelas cartão (cron diário)
□ Tela de inadimplência:
  □ Lista de pacientes devedores (view vw_inadimplentes)
  □ Filtro por clínica, valor, tempo
  □ Ação rápida: registrar pagamento
□ Tela de projeção de recebimentos futuros:
  □ Calendário/tabela de parcelas por mês futuro
  □ Visão de fluxo de caixa projetado
□ Dashboard parceiro — inadimplência (só seus pacientes)
```

### Fase 5: Polish & Deploy (Semana 6-7)

```
□ Testes funcionais completos
  □ Testar RLS com usuário parceiro (não pode ver dados de outra clínica)
  □ Testar fluxo completo: upload → processamento → cálculo → dashboard
  □ Testar registro de pagamento → parcelas → inadimplência
  □ Testar recálculo de resumo mensal
□ Ajustes de UX com feedback do gerente financeiro
□ Deploy Vercel (produção)
□ Configurar domínio (se aplicável)
□ Criar contas das clínicas parceiras reais
□ Upload dos dados do primeiro mês real
□ Documentação básica de uso (como fazer upload, como interpretar dashboard)
```

---

## 9. Riscos e Mitigações

### Riscos Técnicos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| T1 | Planilhas do Clinicorp mudam formato | Média | Alto | Mapeamento flexível de colunas + validação no preview + alerta quando colunas não casam |
| T2 | Cálculo financeiro com erro | Média | Crítico | Manter dados brutos intactos + recálculo a qualquer momento + validação manual dos primeiros 3 meses |
| T3 | n8n fora do ar | Baixa | Médio | Dados ficam na staging, reprocessa quando voltar + monitoramento via Telegram |
| T4 | Performance do dashboard degradar | Baixa | Baixo | Resumo pré-calculado + indexes + views SQL |

### Riscos de Negócio

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| N1 | Regras de cálculo mais complexas que o mapeado | Alta | Médio | Validar todas as regras com gerente financeiro antes de implementar Fase 3 |
| N2 | Clínicas parceiras não adotarem o sistema | Baixa | Médio | Interface simples (read-only para parceiro), onboarding assistido |
| N3 | Volume de dados crescer rápido | Baixa | Baixo | Arquitetura já preparada para escala (Supabase Pro é upgrade simples) |

### Decisões Técnicas Pendentes

| Decisão | Quando resolver | Impacto |
|---------|----------------|---------|
| Mapeamento exato das colunas das planilhas do Clinicorp | Início da Fase 2 | Define o parser de upload |
| Base de cálculo da comissão médica: % sobre bruto ou líquido? | Início da Fase 3 | Muda a fórmula do resumo mensal |
| Domínio personalizado (parceiros.beautysmile.com?) | Fase 5 | Apenas configuração DNS |

---

## 10. Requisitos para PRDs

### PRD 1: Módulo de Upload de Planilhas
- **Escopo**: Upload XLSX, parse no browser, preview, confirmação, processamento n8n
- **Inputs**: 4 tipos de planilha (orçamentos fechados/abertos, tratamentos, recebimentos)
- **Outputs**: Dados estruturados nas tabelas definitivas do Supabase
- **Critérios de aceite**: Upload de planilha modelo funciona end-to-end, dados conferem com planilha original, duplicidade é detectada

### PRD 2: Motor de Cálculo Financeiro
- **Escopo**: Workflow n8n que cruza dados e gera resumo mensal
- **Inputs**: Dados das 4 tabelas + configurações (custos, taxas, mão de obra)
- **Outputs**: resumo_mensal preenchido com todos os campos
- **Critérios de aceite**: Cálculo confere com planilha Excel que Beauty Smile usa hoje (mesmos números)

### PRD 3: Dashboard Admin Beauty Smile
- **Escopo**: Visão geral, drill-down por clínica, KPIs, gráficos
- **Inputs**: resumo_mensal + dados brutos para detalhamento
- **Outputs**: Interface visual com cards, gráficos, tabelas filtráveis
- **Critérios de aceite**: Admin vê dados de todas as clínicas, navegação intuitiva, carregamento <2s

### PRD 4: Dashboard Parceiro
- **Escopo**: Visão restrita da clínica parceira
- **Inputs**: Mesmos dados, filtrados por clinica_id via RLS
- **Outputs**: Interface read-only com seus KPIs e detalhamentos
- **Critérios de aceite**: Parceiro não consegue acessar dados de outra clínica (testar RLS)

### PRD 5: Módulo de Pagamentos e Inadimplência
- **Escopo**: Registro de pagamentos, parcelas cartão, controle de devedores
- **Inputs**: Dados do pagamento (valor, forma, parcelas)
- **Outputs**: Atualização de orçamento + parcelas projetadas + view de inadimplentes
- **Critérios de aceite**: Pagamento parcelado gera N parcelas, saldo do orçamento atualiza corretamente, inadimplentes aparecem filtrados

---

## Anexos

### A. Decisões Técnicas e Trade-offs

| Decisão | Escolha | Alternativa Descartada | Motivo |
|---------|---------|----------------------|--------|
| Arquitetura geral | Next.js monolito + n8n | Microserviços / Edge Functions | Simplicidade para 1-3 clínicas, n8n já disponível |
| Processamento XLSX | Browser preview + n8n servidor | 100% browser ou 100% servidor | Melhor UX (preview) + robustez (servidor) |
| Cálculos financeiros | Híbrido (dados brutos + resumo materializado) | Tempo real ou só materializado | Auditabilidade + performance |
| Multi-tenancy | Supabase RLS | Filtro por aplicação | Segurança no nível do banco, zero código extra |
| Auth | Supabase Auth email+senha | OAuth, Clerk, Auth0 | Simplicidade, zero custo, integração nativa com RLS |
| UI | @beautysmile/design-system (Admin Theme) | Tailwind puro, shadcn/ui direto | Consistência visual, componentes prontos, identidade BS |
| Notificações | Telegram via n8n | Email, WhatsApp | Já usado no dia-a-dia, integração simples no n8n |

### B. Templates do Design System Utilizados

Do `@beautysmile/design-system`, os templates admin que serão base:

- **LoginAdmin** → Tela de login
- **DashboardAdmin** → Home com KPIs e gráficos
- **ListWithFilters** → Listas de orçamentos, tratamentos, inadimplentes
- **DetailView** → Detalhamento de orçamento / paciente
- **CRUD** → Configurações (clínicas, procedimentos, médicos)
- **Settings** → Parâmetros financeiros
- **Profile** → Perfil do usuário

Componentes glass morphism podem ser usados nas telas do parceiro para diferenciação visual.

### C. Mapeamento das Planilhas Clinicorp → Schema do Banco

#### C.1 Planilha: Orçamentos (orcamentos_fechados / orcamentos_abertos)

**Estrutura da planilha** (16 colunas):

| # | Coluna Clinicorp | → Campo no Schema | Regra de Transformação |
|---|-----------------|-------------------|----------------------|
| 1 | Data Criação | `data_fechamento` | Parse DD/MM/YYYY → DATE |
| 2 | Data | — | Ignorar (duplicada da Data Criação) |
| 3 | Status | Determina a tabela destino | "APPROVED" → `orcamentos_fechados`; outros → `orcamentos_abertos` |
| 4 | Motivo | — | Ignorar (geralmente vazio) |
| 5 | Profissional | `profissional` | Novo campo a adicionar no schema |
| 6 | Paciente | `paciente_nome` | ⚠️ Limpar número entre parênteses: "Fabio Massao Sakuma (18)" → "Fabio Massao Sakuma" |
| 7 | Telefone | `paciente_telefone` | Novo campo a adicionar (útil para inadimplência) |
| 8 | Procedimentos | `procedimentos_texto` | Texto livre, múltiplos procedimentos separados por vírgula. Armazenar completo para referência |
| 9 | Valor | `valor_bruto` | Novo campo informativo. Parse "14.450,00" → 14450.00 |
| 10 | Valor Total Com Desconto | `valor_total` | **ESTE É O VALOR DE FATURAMENTO**. Parse formato BR → DECIMAL |
| 11 | Observações | `observacoes` | Texto livre opcional |
| 12 | Como conheceu? | `indicacao_flag` | Se = "Indicado por" → marcar `tem_indicacao = true`. Médico será selecionado manualmente no dashboard |
| 13 | Desconto-Porcentagem | `desconto_percentual` | Informativo |
| 14 | Desconto-Reais | `desconto_reais` | Informativo |
| 15 | Valor Total | — | **IGNORAR** — só aparece na última linha como soma/total |
| 16 | Ticket Médio | — | **IGNORAR** — só aparece na última linha como média |

**Regras de processamento:**

1. **Última linha é totalizadora** — detectar e ignorar (checkar se `Paciente` está vazio ou se `Valor Total` / `Ticket Médio` estão preenchidos)
2. **Status determina tabela destino**: "APPROVED" → `orcamentos_fechados` (com status pagamento "em_aberto"); qualquer outro status → `orcamentos_abertos`
3. **Nome do paciente**: Remover número entre parênteses via regex: `nome.replace(/\s*\(\d+\)\s*$/, '').trim()`
4. **Valores monetários**: Converter formato BR "14.450,00" → 14450.00: `valor.replace('.', '').replace(',', '.')`
5. **Flag de indicação**: Se "Como conheceu?" contém "Indicado por" → `tem_indicacao = true`. O `medico_indicador_id` será preenchido manualmente pelo admin no dashboard após o import
6. **Procedimentos**: Armazenar texto completo como referência. Não split automático nesta planilha (os procedimentos executados vêm na outra planilha com detalhamento)

**Campos novos a adicionar no schema `orcamentos_fechados`:**

```sql
ALTER TABLE orcamentos_fechados ADD COLUMN profissional TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN paciente_telefone TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN procedimentos_texto TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN valor_bruto DECIMAL(12,2);
ALTER TABLE orcamentos_fechados ADD COLUMN desconto_percentual DECIMAL(5,2);
ALTER TABLE orcamentos_fechados ADD COLUMN desconto_reais DECIMAL(12,2);
ALTER TABLE orcamentos_fechados ADD COLUMN observacoes TEXT;
ALTER TABLE orcamentos_fechados ADD COLUMN tem_indicacao BOOLEAN NOT NULL DEFAULT false;
```

#### C.2 Planilha: Procedimentos Executados (tratamentos_executados)

**Estrutura da planilha** (8 colunas):

| # | Coluna Clinicorp | → Campo no Schema | Regra de Transformação |
|---|-----------------|-------------------|----------------------|
| 1 | Executado | `data_execucao` | Parse DD/MM/YYYY → DATE |
| 2 | Paciente | `paciente_nome` | Já vem limpo (sem número) |
| 3 | Telefone | — | Ignorar (já capturado nos orçamentos) |
| 4 | Profissional | `profissional` | Novo campo a adicionar |
| 5 | Procedimento | → SPLIT por "+" | ⚠️ **CRÍTICO**: Cada item separado por "+" é um procedimento independente com custo próprio |
| 6 | Região | `regiao` | Geralmente vazio, armazenar se presente |
| 7 | Tempo Atendimento | — | Ignorar (geralmente vazio) |
| 8 | Valor | `valor` | Parse formato BR → DECIMAL |

**Regra de split de procedimentos ("+"):**

Quando a coluna "Procedimento" contém "+", cada parte é um procedimento independente que deve gerar um registro separado na tabela `tratamentos_executados`.

Exemplo de transformação:
```
ENTRADA (1 linha da planilha):
  Paciente: "João Luiz Pasqual"
  Procedimento: "Clareamento dental com Laser Fotona (sessão 1) - cortesia + Fotos iniciais"
  Data: 21/01/2026

SAÍDA (2 registros no banco):
  Registro 1:
    paciente_nome: "João Luiz Pasqual"
    procedimento_nome: "Clareamento dental com Laser Fotona (sessão 1) - cortesia"
    data_execucao: 2026-01-21

  Registro 2:
    paciente_nome: "João Luiz Pasqual"
    procedimento_nome: "Fotos iniciais"
    data_execucao: 2026-01-21
```

**Regras de processamento:**

1. **Split por "+"**: `procedimento.split('+').map(p => p.trim()).filter(p => p.length > 0)`
2. **Cada parte gera 1 registro** na tabela `tratamentos_executados`
3. **Match com tabela `procedimentos`**: Tentar casar `procedimento_nome` (após split) com `procedimentos.nome` para obter o `custo_fixo`. Se não casar, armazenar o nome original e marcar `procedimento_id = null` (match manual depois)
4. **Fuzzy matching sugerido**: Procedimentos podem ter variações de texto (ex: "Consulta e avaliação - protocolo de ronco e apneia" vs "Consulta e avaliação"). Considerar match pelo início do nome ou por palavras-chave

**Campo novo a adicionar no schema `tratamentos_executados`:**

```sql
ALTER TABLE tratamentos_executados ADD COLUMN profissional TEXT;
ALTER TABLE tratamentos_executados ADD COLUMN regiao TEXT;
ALTER TABLE tratamentos_executados ADD COLUMN valor DECIMAL(12,2) DEFAULT 0;
```

#### C.3 Planilhas Pendentes (ainda não recebidas)

As duas planilhas abaixo ainda precisam ser analisadas quando disponíveis:

**Orçamentos Abertos** — Pode ser a mesma planilha de Orçamentos filtrada por status ≠ "APPROVED", ou uma planilha separada. Verificar se o Clinicorp exporta separadamente.

**Recebimentos / Pagamentos** — Planilha com dados de pagamentos realizados. Precisamos avaliar se contém: valor pago, forma de pagamento, número de parcelas, data do pagamento. Esta planilha define se o import inicial já pode popular a tabela `pagamentos` ou se tudo começa zerado.

#### C.4 Fluxo de Match de Procedimentos com Custos

```
Upload planilha procedimentos executados
    ↓
Split por "+" → N registros individuais
    ↓
Para cada procedimento:
    ├── Busca EXACT MATCH em procedimentos.nome
    │   └── Encontrou → procedimento_id = id, custo = custo_fixo ✅
    │
    ├── Busca LIKE/ILIKE parcial
    │   └── Encontrou 1 → procedimento_id = id ✅
    │   └── Encontrou N → Marcar para revisão manual ⚠️
    │
    └── Não encontrou nenhum match
        └── procedimento_id = NULL, marcar para revisão manual ⚠️
    ↓
Na tela de preview/pós-upload:
    Mostrar procedimentos sem match para admin associar manualmente
    Opção de "criar novo procedimento" direto do preview
```

### D. Estrutura de Pastas do Projeto (Next.js)

```
beautysmile-partners/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (admin)/              # Layout admin Beauty Smile
│   │   │   ├── dashboard/
│   │   │   ├── clinicas/
│   │   │   │   └── [id]/         # Drill-down por clínica
│   │   │   ├── upload/
│   │   │   ├── financeiro/
│   │   │   ├── inadimplencia/
│   │   │   ├── pagamentos/
│   │   │   └── configuracoes/
│   │   │       ├── clinicas/
│   │   │       ├── procedimentos/
│   │   │       ├── medicos/
│   │   │       └── financeiro/
│   │   ├── (parceiro)/           # Layout parceiro (restrito)
│   │   │   ├── dashboard/
│   │   │   ├── orcamentos/
│   │   │   ├── financeiro/
│   │   │   └── inadimplencia/
│   │   └── api/
│   │       ├── upload/
│   │       ├── pagamentos/
│   │       └── resumo/
│   ├── components/
│   │   ├── charts/               # Componentes de gráficos (recharts)
│   │   ├── upload/               # Upload + preview XLSX
│   │   └── shared/               # Componentes compartilhados
│   ├── lib/
│   │   ├── supabase/             # Client + server + middleware
│   │   └── utils/                # Formatação, cálculos auxiliares
│   └── types/                    # TypeScript types
├── supabase/
│   └── migrations/               # SQL migrations
└── docs/
    └── uso/                      # Documentação de uso
```
