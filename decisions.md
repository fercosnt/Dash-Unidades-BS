# Log de Decisoes

Registre aqui decisoes arquiteturais e tecnicas importantes do projeto.
Formato: data, decisao, contexto, alternativas consideradas.

---

## Template

### [YYYY-MM-DD] Titulo da decisao

**Contexto**: Por que essa decisao precisou ser tomada?
**Decisao**: O que foi decidido?
**Alternativas**: O que mais foi considerado e por que foi descartado?
**Consequencias**: O que muda por causa dessa decisao?

---

## Decisoes

### 2026-02-11 Stack do projeto

**Contexto**: Escolha de stack para dashboard financeiro multi-tenant com 1-3 clinicas.
**Decisao**: Next.js 15 (App Router) + React 19 + Supabase + TypeScript + Tailwind CSS.
**Alternativas**:
- Vite + Express + PostgreSQL — mais controle, mas mais setup e infra para gerenciar
- Remix — bom DX mas ecossistema menor
- @beautysmile/design-system — considerado mas NAO instalado; UI feita com Tailwind puro
**Consequencias**: Deploy simplificado via Vercel, auth e DB gerenciados, RLS nativo. Custo R$0-5/mes no MVP.

### 2026-02-11 Multi-tenancy via RLS

**Contexto**: Precisamos isolar dados financeiros entre clinicas parceiras.
**Decisao**: Row Level Security no Supabase com funcoes SECURITY DEFINER. Coluna tenant: `clinica_id`.
**Alternativas**:
- Filtro no codigo da aplicacao — fragil, um bug expoe dados financeiros
- Schema por tenant — complexo demais para 1-3 clinicas
- Banco separado por tenant — custo proibitivo
**Consequencias**: Seguranca no nivel do banco. Mesmo com bug no frontend, dados ficam isolados. Admin ve tudo, parceiro ve so sua clinica.

### 2026-02-11 UI com Tailwind puro (sem design-system externo)

**Contexto**: Necessidade de interface consistente com identidade Beauty Smile.
**Decisao**: Tailwind CSS puro com tema escuro customizado. @beautysmile/design-system foi descartado.
**Alternativas**:
- @beautysmile/design-system — considerado inicialmente mas NAO instalado (pacote indisponivel)
- Material UI — pesado, estilo diferente
**Consequencias**: Sidebar com gradiente escuro (primary-950 / #151938 / #05071F), componentes feitos do zero com Tailwind. Mais controle visual, sem dependencia externa de UI.

### 2026-02-11 Processamento de planilhas hibrido (browser + n8n)

**Contexto**: Planilhas XLSX do Clinicorp precisam ser importadas mensalmente.
**Decisao**: Parse no browser com SheetJS (preview para usuario) + processamento server-side via n8n (validacao e insercao).
**Alternativas**:
- 100% browser — sem robustez, sem retry, sem notificacao
- 100% servidor — sem preview, UX ruim
**Consequencias**: Melhor UX (preview antes de confirmar) + robustez (retry, logs, notificacoes no n8n).

### 2026-02-11 Split financeiro 60/40 materializado

**Contexto**: Dashboard precisa mostrar KPIs rapidamente.
**Decisao**: Calculos financeiros sao executados pelo n8n e persistidos em tabela `resumo_mensal`. Dashboard le dados pre-calculados.
**Alternativas**:
- Calculo em tempo real a cada request — lento, inconsistente
- Somente materializado sem dados brutos — sem auditabilidade
**Consequencias**: Dashboard carrega <1s. Dados brutos mantidos intactos para auditoria. Recalculo disponivel a qualquer momento.

### 2026-02-11 Formas de pagamento simplificadas

**Contexto**: Definir quais formas de pagamento o sistema aceita.
**Decisao**: 4 formas: Cartao Credito, Cartao Debito, PIX, Dinheiro.
**Alternativas**:
- Incluir Boleto e Transferencia — complexidade desnecessaria para o uso atual
**Consequencias**: Enum simplificado. Parcelas de cartao com projecao D+30. Maximo 12 parcelas.

### 2026-02-11 Comissao medica sobre valor bruto

**Contexto**: Base de calculo da comissao dos medicos indicadores.
**Decisao**: Comissao calculada sobre valor bruto (`valor_total`) do orcamento. Percentual configuravel por medico.
**Alternativas**:
- Comissao sobre valor liquido proporcional — mais complexo, desnecessario para o modelo de negocio atual
**Consequencias**: Calculo simples e direto. `valor_total * (percentual_comissao / 100)`.

### 2026-03-07 Dashboard Admin V2 — estrutura em abas com DRE e Repasse

**Contexto**: Dashboard admin original tinha 6 KPI cards + 2 gráficos + ranking/status em layout único. Sem visibilidade do resultado financeiro (DRE), sem detalhamento de vendas por mês e sem tabelas de orçamentos/procedimentos.
**Decisao**: Reformular com 4 abas (Resumo, Vendas, Procedimentos, Clínicas). Aba Resumo inclui DRE cascata e card de Repasse do Mês. Novas queries com `Promise.all` para manter performance. Tipos separados por finalidade (`KpisAdminV2` com campos operacionais + financeiros).
**Alternativas**:
- Expandir o layout único com seções colapsáveis — visual poluído, não escala para mais dados
- Nova rota `/admin/dashboard/v2` — duplicação desnecessária
**Consequencias**: `DashboardClient.tsx` refatorado com estado `activeTab`. Novas funções de query independentes e reutilizáveis. `KpiCard` recebe prop `subtitle` opcional para exibir contagens operacionais (ex: "15 fechados"). DRE e Repasse calculados sobre dados do `resumo_mensal` (base materializados, não tempo real).

### 2026-03-19 Bug fix: arredondamento na comissao dentista

**Contexto**: Testes financeiros abrangentes revelaram que `calcularComissaoDentista` em `lib/comissao-dentista-queries.ts` nao arredondava o resultado do calculo `faturamentoBruto * (percentual / 100)`, resultando em valores como `7000.000000000001` salvos no banco.
**Decisao**: Adicionar `Math.round(... * 100) / 100` no calculo do `valorComissao` (mesmo padrao usado em `resumo-calculo.ts` e na RPC `registrar_pagamento`).
**Alternativas**:
- Arredondar apenas na exibicao — inconsistente com o resumo e pagamentos
- Usar `toFixed(2)` — retorna string, nao numero
**Consequencias**: Valores de comissao dentista ficam consistentes com 2 casas decimais, alinhados com o padrao do restante do sistema.

### 2026-03-19 Auditoria de seguranca e qualidade

**Contexto**: Preparacao para deploy em producao. Auditoria completa com 6 agentes especializados identificou 52 issues.
**Decisao**: Corrigir todos os bloqueantes e melhorias importantes em dois commits:
1. **Seguranca**: `requireAdmin()` em todos os admin Server Actions (~40 funcoes), role check no AdminLayout, redirect no parceiro layout, remover secret de query params
2. **Qualidade**: `types/database.types.ts` gerado (19 tabelas), error handling em ~30 queries Supabase, `console.error` em 14 catch blocks, Zod em 7 arquivos de actions, N+1→bulk em 3 funcoes, centralizar date/currency utils, ESLint 9 flat config
**Alternativas**:
- Deploy sem auditoria — risco de seguranca (parceiro acessando admin) e dados financeiros corrompidos (resumo zerado)
- Corrigir incrementalmente — mais seguro mas mais lento
**Consequencias**: Projeto significativamente mais seguro e robusto. `requireAdmin()` como padrao para todo Server Action admin. Error handling previne corrupcao de dados financeiros. ESLint configurado para CI.

### 2026-03-20 Edição de débito parceiro pelo admin

**Contexto**: Admin precisava corrigir o valor total de um débito já cadastrado (ex: renegociação, erro de digitação), mas a tela de configurações/débitos só permitia criar e registrar pagamentos.
**Decisão**: Adicionar server action `editarDebito` com validação Zod + modal de edição no `DebitosClient.tsx`. Validação impede que o novo valor total seja menor que o já pago.
**Alternativas**:
- Excluir e recriar o débito — perderia histórico de abatimentos
- Edição inline direto na tabela — UX inconsistente com o padrão de modais do projeto
**Consequências**: Admin pode alterar descrição e valor total de qualquer débito ativo. Saldo restante recalculado automaticamente. Se novo valor ≤ valor pago, débito é marcado como quitado.

### 2026-03-20 Despesas operacionais e DRE Beauty Smile

**Contexto**: A Beauty Smile precisava de visibilidade sobre o resultado real por unidade clínica. O DRE existente mostrava o split 60/40 com o parceiro, mas não mostrava quanto a BS realmente lucra após pagar despesas operacionais (salários, insumos, equipamentos, MKT, etc.) e a diferença entre taxa de cartão cobrada vs real.
**Decisão**: Criar módulo completo com: (1) DRE BS onde TUDO que é descontado no split = receita da BS, (2) taxas reais de cartão por bandeira (visa_master vs outros) e modalidade/parcelas, (3) despesas operacionais com categorias dinâmicas. Despesas ficam pós-split (custo exclusivo da BS).
**Alternativas**:
- Despesas pré-split (afetando o 40% do parceiro) — incorreto para o modelo de negócio
- Taxa de cartão única — taxas variam significativamente entre Visa/Master e outras bandeiras
- Categorias como enum — pouco flexível, admin precisa gerenciar pelo painel
- Cálculo em tempo real — manter padrão materializado, mas DRE BS é calculado on-demand (dados base já estão em resumo_mensal)
**Consequências**: 3 novas tabelas (categorias_despesa, despesas_operacionais, taxas_cartao_reais), coluna bandeira em pagamentos, página /admin/despesas com DRE BS + gestão. Reusa componentes existentes (PeriodoSelector, ClinicaSelector, xlsx-parser). Modelo financeiro: Receita BS bruta → (-) taxa real cartão → receita pós taxas → (-) comissão dentista → (-) despesas → resultado.

### 2026-03-21 Página de despesas com 3 abas (Recebíveis, Faturamento, Despesas)

**Contexto**: A página `/admin/despesas` tinha o DRE BS (faturamento) e a tabela de despesas em layout único. O admin queria ver tanto a visão de faturamento quanto a visão de caixa (o que realmente entrou na conta), além de separar a gestão de despesas em uma aba própria.
**Decisão**: Reestruturar a página em 3 abas: (1) Recebíveis — visão caixa com breakdown por tipo de pagamento + taxa real + líquido, (2) Faturamento — DRE BS existente (receita bruta → resultado), (3) Despesas — gestão completa (form, upload XLSX, copiar mês anterior, tabela).
**Alternativas**:
- Duas páginas separadas (/admin/despesas e /admin/recebiveis) — mais código, UX fragmentada
- Tudo em uma página sem abas — layout poluído, muito scroll
**Consequências**: `DespesasClient.tsx` refatorado com estado `activeTab`. Novo componente `DreRecebiveis.tsx` e função `calcularDreRecebiveis()`. Recebíveis contabiliza: PIX/dinheiro + débito/crédito à vista (imediato) + parcelas cartão recebidas (status='recebido'). Crédito parcelado (>1x) entra via parcelas_cartao, não como pagamento direto.

### 2026-03-21 Redesenho Clinicorp — Sync diário automático (elimina XLSX)

**Contexto**: A integração Clinicorp API (passos 0-7) foi implementada com sync manual e upload XLSX como alternativa. O admin queria dados sempre atualizados sem intervenção, e a API fornece tudo (orçamentos + pagamentos + tratamentos executados via StepsList), tornando o upload XLSX desnecessário.
**Decisão**: (1) Sync diário via Vercel Cron (3:00 BRT), mês atual + anterior, com recálculo automático do `resumo_mensal`. (2) Tratamentos executados extraídos dos Steps da API (Executed="X"). (3) Eliminar upload XLSX e pagamento manual na inadimplência. (4) Indicações marcadas manualmente no fechamento (API não fornece "Como conheceu?"). (5) Manter estorno para correções.
**Alternativas**:
- Sync mensal manual — desatualizado, depende do admin lembrar
- Manter upload XLSX como fallback — complexidade desnecessária, API é source of truth
- Webhook n8n para recálculo — roundtrip desnecessário, chamar `calcularEPersistirResumo()` direto
- Tratamentos por ID único — API não fornece, strategy de replace por mês funciona
**Consequências**: Dashboard sempre atualizado (sync 3h BRT). Página de upload vira "Sincronização" (status + histórico). `sync_logs` para auditoria. Coluna `origem` em tratamentos para distinguir manual vs API. Vercel Pro necessário (maxDuration 300s). n8n WF1/WF2 (upload processing) podem ser desativados gradualmente.

### 2026-03-21 KPI "A Receber" calculado em tempo real

**Contexto**: O KPI "A Receber" no dashboard lia `total_a_receber_mes` do `resumo_mensal`, que é calculado uma vez no momento do upload/n8n. Esse valor ficava desatualizado: no Resumo Geral somava apenas `valor_em_aberto` dos orçamentos (inadimplência), e por mês mostrava o valor estático do momento do cálculo — não refletia parcelas de cartão que foram recebidas ou novas que surgiram.
**Decisão**: KPI "A Receber" agora é calculado em tempo real buscando `parcelas_cartao` com `status = 'projetado'` (parcelas futuras que ainda vão cair na conta). Corrigido em 3 funções: `fetchKpisAdmin`, `fetchKpisAdminResumoGeral`, `fetchKpisAdminV2`.
**Alternativas**:
- Recalcular `resumo_mensal` com frequência via n8n — mais complexo, delay entre pagamento e dashboard
- Manter valor estático + recalcular ao registrar pagamento — inconsistente se n8n falhar
**Consequências**: O valor "A Receber" sempre reflete o estado real das parcelas projetadas. Custo: uma query adicional a `parcelas_cartao` por carregamento do dashboard (tabela pequena, impacto negligível).

### 2026-02-11 Notificacoes via Telegram

**Contexto**: Canal de comunicacao para alertas do sistema.
**Decisao**: Telegram via n8n (bot a ser configurado em fase posterior).
**Alternativas**:
- Email — mais formal mas menos agil
- WhatsApp — custo e complexidade da API
- Slack — equipe nao usa
**Consequencias**: Integracao simples no n8n. Equipe ja usa Telegram no dia-a-dia.
