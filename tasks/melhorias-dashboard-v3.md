# Melhorias Dashboard — V3

Data: 2026-03-10

---

## 1. Filtros do Dashboard — Meses 2026 + Filtro por Unidade

**Contexto:** O seletor de mês atual lista meses de 2025 e não inclui todos os meses de 2026. Falta também filtro por clínica/unidade.

### 1.1 Seletor de Mês
- Exibir apenas os meses do ano de **2026** (Jan–Dez), mesmo os futuros
- Formato: `Mar/2026`, `Fev/2026`, etc. — igual ao padrão atual
- Remover meses de 2025 do dropdown

### 1.2 Novo Seletor de Unidade
- Dropdown no **mesmo estilo visual** do seletor de mês
- Opções: `Todas as Unidades` (padrão) + cada clínica parceira
- Posicionamento: ao lado do seletor de mês, antes do botão de calcular
- Quando uma unidade específica é selecionada, todos os dados do dashboard filtram por ela

### 1.3 Cálculo Automático
- **Remover o botão "Calcular resumo"** do header (ou mantê-lo discreto apenas para recálculo manual)
- Ao mudar o mês **ou** a unidade, o dashboard recarrega automaticamente os dados sem precisar clicar em "Calcular"
- Usar `useEffect` com debounce leve (300ms) ou `router.push` com novo searchParam

---

## 2. Aba Vendas — Visão por Tratamento

**Contexto:** Atualmente a aba Vendas mostra evolução de orçamentos fechados/abertos. Falta visibilidade sobre **quais tratamentos estão sendo vendidos** e sua representatividade.

### 2.1 Tabela de Tratamentos Vendidos
- Colunas: Tratamento | Qtde vendida | Valor total | % do faturamento
- Ordenado por valor total decrescente
- Badge de percentual colorido (verde/amarelo/vermelho conforme participação)

### 2.2 Gráfico de Evolução por Tratamento
- Gráfico de linhas com os últimos 3–6 meses
- Cada linha = 1 tratamento (top 5 por faturamento)
- Toggle para alternar entre "Quantidade" e "Valor" no eixo Y
- Filtro opcional para selecionar quais tratamentos exibir

### Dados necessários
```
SELECT procedimento_nome, mes,
       COUNT(*) as qtde, SUM(valor_total) as valor_total
FROM orcamentos_fechados
WHERE mes IN (últimos N meses)
GROUP BY procedimento_nome, mes
ORDER BY valor_total DESC
```

---

## 3. Aba Procedimentos — Gráfico de Pizza

**Contexto:** Melhorar a visualização da pizza de procedimentos realizados.

- **Pizza chart** com % de cada procedimento sobre o total de procedimentos realizados no período
- Tooltip com nome, qtde e percentual
- Tabela de ranking abaixo: procedimento | qtde | custo unit. | custo total | %
- Se a unidade estiver filtrada, mostrar apenas os procedimentos daquela unidade

---

## 4. Revisão de Procedimentos — Excluir Linhas

**Contexto:** Na tela de revisão de match de procedimentos (pós-upload), é necessário poder excluir itens indevidos individualmente ou em lote.

### 4.1 Botão Excluir por Linha
- Ícone de lixeira em cada linha da tabela de revisão
- Confirmação inline (ex: "Confirmar exclusão?" com botão Sim/Cancelar na própria linha)
- Remove o tratamento do batch sem afetar outros registros

### 4.2 Exclusão em Seleção Múltipla
- Quando um ou mais itens estão selecionados via checkbox, exibir botão **"Excluir selecionados"** na toolbar
- Modal de confirmação listando quantos itens serão excluídos
- Feedback: "X tratamentos excluídos com sucesso"

### 4.3 Indicador no Resumo do Upload
- Mostrar no resumo do batch: "X tratamentos excluídos manualmente"

---

## 5. Fechamento Mensal e Baixa de Repasse

**Contexto:** Formalizar o processo de transferência mensal para a clínica parceira.

*(Detalhado em `proximas-implementacoes.md` — itens 1 e 2)*

### Fluxo
1. Admin acessa página de **Repasses** → vê lista de meses pendentes por clínica
2. Clica em "Dar baixa" para o mês → modal mostra cálculo detalhado:
   - Total recebido no mês
   - (-) Deduções (taxa cartão, impostos, custos, comissões)
   - = Valor a transferir (40% clínica)
3. Admin confirma data, valor transferido e observação opcional
4. Status muda para "Transferido" com data e valor registrados

### Integração com Saldo Devedor (item 6)
- No modal de baixa, exibir saldo devedor da clínica (se houver)
- Opção de **abater parte do repasse no saldo devedor**:
  - Informar valor a abater (máximo = valor do repasse)
  - Valor final transferido = Repasse — Abatimento
  - Saldo devedor atualizado automaticamente

---

## 6. Saldo Devedor por Unidade (Franquia Fee)

**Contexto:** Ao fechar parceria, a clínica assume um débito de entrada com a Beauty Smile (ex: R$250.000). Esse valor pode ser pago à vista ou descontado mensalmente do repasse.

### Estrutura de Dados
Nova tabela `debito_parceiro`:
```sql
CREATE TABLE debito_parceiro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas_parceiras(id),
  descricao   text NOT NULL,           -- ex: "Franquia Fee - Contrato 2025"
  valor_total numeric(10,2) NOT NULL,
  valor_pago  numeric(10,2) DEFAULT 0,
  data_inicio date NOT NULL,
  status      text DEFAULT 'ativo',    -- ativo | quitado
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE abatimentos_debito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debito_id      uuid NOT NULL REFERENCES debito_parceiro(id),
  mes_referencia text NOT NULL,        -- YYYY-MM
  valor_abatido  numeric(10,2) NOT NULL,
  repasse_id     uuid,                 -- ref ao repasse que gerou o abatimento
  created_at     timestamptz DEFAULT now()
);
```

### Interface Admin
- **Configurações → Unidades** (ou aba dedicada): cadastrar débito da clínica
  - Campos: Descrição, Valor Total, Data início
  - Valor preenchido livremente (não fixo em R$250k)
- **Card de Saldo Devedor** na aba Clínicas do dashboard:
  - Valor total do débito
  - Valor já pago
  - Saldo restante
  - Barra de progresso
- **Histórico de abatimentos** com data, mês referência e valor

### Visão do Parceiro
- Card somente leitura "Seu saldo devedor" no dashboard parceiro
- Histórico de abatimentos por mês

---

## 7. Página de Comissões Médicas

**Contexto:** Controlar o pagamento das comissões para cada médico indicador e registrar a baixa quando pago.

### Estrutura
- Rota: `app/admin/comissoes/`

### Lista de Comissões por Período
- Filtros: mês/período + clínica + médico indicador + status (pendente / pago)
- Tabela: Médico | Clínica | Mês ref. | Valor comissão | Status | Data pagamento
- KPIs no topo: Total a pagar no mês | Total pago no período | Médicos com comissão pendente

### Dar Baixa em Comissão
- Botão "Registrar pagamento" em cada linha pendente
- Modal: confirmar data de pagamento + observação opcional
- Atualiza status para "pago" com data e valor

### Agrupamento por Médico
- View resumida: médico | total comissões | qtde orçamentos | status geral
- Drill-down para ver detalhes de cada orçamento que gerou comissão

### Estrutura de Dados
Nova tabela `pagamentos_comissao`:
```sql
CREATE TABLE pagamentos_comissao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_indicador_id   uuid NOT NULL REFERENCES medicos_indicadores(id),
  clinica_id            uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia        text NOT NULL,
  valor_comissao        numeric(10,2) NOT NULL,
  status                text DEFAULT 'pendente',  -- pendente | pago
  data_pagamento        date,
  observacao            text,
  created_at            timestamptz DEFAULT now()
);
```

---

## 8. Exportar Relatório PDF

**Contexto:** Gerar um PDF mensal para enviar à clínica parceira com o resumo do período.

### Conteúdo do PDF
1. **Cabeçalho**: Logo Beauty Smile + nome da clínica + período
2. **Resumo Financeiro (DRE)**:
   - Faturamento Bruto
   - Deduções (taxa cartão, impostos, custos, comissões)
   - Valor Líquido + Split (% BS / % Clínica)
3. **Repasse do Mês**:
   - Base caixa (total recebido)
   - Deduções
   - Valor a transferir
   - Saldo devedor (se houver) + abatimento do mês
4. **Top Procedimentos** (tabela)
5. **Top Tratamentos Vendidos** (tabela)
6. **Rodapé**: data de geração + assinatura Beauty Smile

### Implementação
- Biblioteca: `@react-pdf/renderer` ou `jsPDF` + `html2canvas`
- Botão "Exportar PDF" no header do dashboard (admin e parceiro)
- Geração client-side ou via API Route para PDFs mais complexos
- Nomeclatura do arquivo: `relatorio-[clinica]-[mes-ano].pdf`

---

## 9. Comissão da Dentista (Beauty Smile)

**Contexto:** A Beauty Smile paga uma comissão para a dentista responsável por cada unidade parceira. Esse valor sai da **parte da Beauty Smile** (não do split da clínica) e precisa ser calculado, controlado e ter baixa registrada mensalmente.

Isso é **diferente** da comissão dos médicos indicadores (item 7): aquela é paga pela clínica; esta é paga pela Beauty Smile.

### 9.1 Regras de Cálculo — Tiers por Volume de Vendas

O percentual varia conforme o número de vendas (orçamentos fechados) no mês:

| Tier | Qtde de vendas | % sobre faturamento |
|------|---------------|---------------------|
| Básico | Até 7 vendas | 2,0% |
| Médio | 8 a 12 vendas | 2,5% |
| Top | Acima de 12 vendas | 3,0% |

- **Base de cálculo:** Faturamento Bruto da clínica no mês
- **Sai de:** Parcela da Beauty Smile (60%), reduzindo o resultado líquido da BS
- Os **limites de tier** e **percentuais** são editáveis nas configurações (não hardcoded)

### 9.2 Configuração dos Tiers

Na tela de Configurações Financeiras (`/admin/configuracoes`), nova seção "Comissão Dentista":

```
Tier 1: Até [  7  ] vendas → [  2,0  ]%
Tier 2: De [  8  ] a [ 12  ] vendas → [  2,5  ]%
Tier 3: Acima de [ 12  ] vendas → [  3,0  ]%
```

Campos editáveis: limites superiores de cada tier + percentual de cada tier.
Vigência: mesmo sistema de `configuracoes_financeiras` — ao salvar nova config, fecha a anterior.

### 9.3 Cálculo Automático

A cada fechamento de mês (quando `resumo_mensal` é calculado), o sistema:
1. Conta orçamentos fechados no mês para a clínica
2. Identifica o tier ativo
3. Calcula `comissao_dentista = faturamento_bruto * percentual_tier`
4. Grava o valor no `resumo_mensal` como coluna `comissao_dentista`
5. Subtrai da parcela da Beauty Smile no DRE

### 9.4 DRE Cascata — Impacto

A linha "Resultado Beauty Smile" do DRE passa a mostrar:
```
= Valor Líquido              R$ L         L%
    → Beauty Smile (60%)     R$ BS
    (-) Comissão Dentista    -R$ CD       CD%
    = Resultado Líquido BS   R$ BSL
    → Clínica (40%)          R$ C
```

### 9.5 Página de Controle de Comissão Dentista

Rota: `app/admin/comissoes-dentista/`

- **Lista mensal:** mês | clínica | qtde vendas | tier atingido | % aplicado | valor comissão | status | ação
- **KPIs:** total a pagar no mês | total pago no período | valor por tier (quantas clínicas em cada tier)
- **Dar baixa:** modal com data de pagamento + observação
- **Histórico:** todos os meses com status (pendente / pago)

### 9.6 Estrutura de Dados

```sql
-- Configuração dos tiers (nova seção em configuracoes_financeiras
-- ou tabela separada)
CREATE TABLE config_comissao_dentista (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier1_limite    int NOT NULL DEFAULT 7,     -- "até X vendas"
  tier1_percentual numeric(5,2) NOT NULL DEFAULT 2.00,
  tier2_limite    int NOT NULL DEFAULT 12,    -- "de tier1+1 a X vendas"
  tier2_percentual numeric(5,2) NOT NULL DEFAULT 2.50,
  tier3_percentual numeric(5,2) NOT NULL DEFAULT 3.00, -- "acima de tier2"
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim    date,                        -- NULL = vigente
  created_at      timestamptz DEFAULT now()
);

-- Registro mensal da comissão por clínica
CREATE TABLE comissoes_dentista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id       uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia   text NOT NULL,              -- YYYY-MM
  qtde_vendas      int NOT NULL,
  tier_aplicado    int NOT NULL,               -- 1, 2 ou 3
  percentual       numeric(5,2) NOT NULL,
  base_calculo     numeric(12,2) NOT NULL,     -- faturamento bruto
  valor_comissao   numeric(12,2) NOT NULL,
  status           text DEFAULT 'pendente',   -- pendente | pago
  data_pagamento   date,
  observacao       text,
  config_id        uuid REFERENCES config_comissao_dentista(id),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (clinica_id, mes_referencia)
);
```

### 9.7 Arquivos a Criar / Modificar

- `supabase/migrations/009_comissoes_dentista.sql` — tabelas acima
- `lib/comissao-dentista-queries.ts` — queries de cálculo, listagem e baixa
- `app/admin/comissoes-dentista/` — página de controle
- `app/admin/configuracoes/` — nova seção de configuração de tiers
- `lib/resumo-calculo.ts` — incluir `comissao_dentista` no cálculo mensal
- `components/dashboard/DreCascata.tsx` — linha adicional "Comissão Dentista" no DRE

---

## Ordem de Implementação Sugerida

| # | Feature | Prioridade | Esforço |
|---|---------|-----------|---------|
| 1 | Filtros: meses 2026 + filtro unidade + auto-calc | Alta | Baixo |
| 2 | Excluir na revisão de procedimentos | Alta | Baixo |
| 3 | Baixa de repasse mensal | Alta | Médio |
| 4 | Saldo devedor por unidade | Alta | Médio |
| 5 | Comissão da dentista (tiers + baixa + DRE) | Alta | Médio |
| 6 | Página de comissões médicos indicadores | Média | Médio |
| 7 | Aba Vendas: tratamentos vendidos | Média | Médio |
| 8 | Exportar PDF | Média | Alto |
| 9 | Gráfico evolução por tratamento | Baixa | Alto |

---

## Arquivos a Criar / Modificar

### Filtros (item 1)
- `components/dashboard/PeriodoSelector.tsx` — gerar meses 2026
- `components/dashboard/ClinicaSelector.tsx` — novo componente
- `app/admin/dashboard/DashboardClient.tsx` — integrar clinicaId + auto-fetch
- `app/admin/dashboard/page.tsx` — receber searchParam clinicaId

### Revisão de Procedimentos (item 2)
- `app/admin/upload/[id]/revisao/` — adicionar botões excluir + seleção múltipla
- `app/api/upload/tratamentos/[id]/route.ts` — endpoint DELETE

### Repasse e Saldo Devedor (itens 3 e 4)
- `supabase/migrations/007_repasses_debito.sql` — novas tabelas
- `app/admin/repasses/` — nova rota
- `lib/repasse-queries.ts` — queries de repasse e débito

### Comissão Dentista (item 5)
- `supabase/migrations/009_comissoes_dentista.sql`
- `lib/comissao-dentista-queries.ts`
- `app/admin/comissoes-dentista/` — página de controle
- `app/admin/configuracoes/` — seção de tiers
- `lib/resumo-calculo.ts` — incluir no cálculo
- `components/dashboard/DreCascata.tsx` — nova linha no DRE

### Comissões Médicos Indicadores (item 6)
- `supabase/migrations/008_pagamentos_comissao.sql`
- `app/admin/comissoes/` — nova rota
- `lib/comissao-queries.ts`

### PDF (item 8)
- `components/pdf/RelatorioPDF.tsx`
- `app/api/relatorio/pdf/route.ts` ou geração client-side

### Aba Vendas — Tratamentos (item 2)
- `lib/dashboard-queries.ts` — `fetchTratamentosVendidos(mes, clinicaId)`
- `components/dashboard/ChartTratamentosEvolucao.tsx`
- `components/dashboard/TabelaTratamentosVendidos.tsx`
- `app/admin/dashboard/DashboardClient.tsx` — integrar na aba Vendas
