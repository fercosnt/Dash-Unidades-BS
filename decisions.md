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

### 2026-02-11 Comissao medica sobre valor liquido

**Contexto**: Base de calculo da comissao dos medicos indicadores.
**Decisao**: Comissao calculada sobre valor liquido proporcional do orcamento (com deducoes proporcionais de custos, taxas e impostos).
**Alternativas**:
- Comissao sobre valor bruto — mais simples mas menos justo
**Consequencias**: Calculo mais complexo (proporcionalidade por orcamento), mas resultado mais preciso e justo para todas as partes.

### 2026-03-07 Dashboard Admin V2 — estrutura em abas com DRE e Repasse

**Contexto**: Dashboard admin original tinha 6 KPI cards + 2 gráficos + ranking/status em layout único. Sem visibilidade do resultado financeiro (DRE), sem detalhamento de vendas por mês e sem tabelas de orçamentos/procedimentos.
**Decisao**: Reformular com 4 abas (Resumo, Vendas, Procedimentos, Clínicas). Aba Resumo inclui DRE cascata e card de Repasse do Mês. Novas queries com `Promise.all` para manter performance. Tipos separados por finalidade (`KpisAdminV2` com campos operacionais + financeiros).
**Alternativas**:
- Expandir o layout único com seções colapsáveis — visual poluído, não escala para mais dados
- Nova rota `/admin/dashboard/v2` — duplicação desnecessária
**Consequencias**: `DashboardClient.tsx` refatorado com estado `activeTab`. Novas funções de query independentes e reutilizáveis. `KpiCard` recebe prop `subtitle` opcional para exibir contagens operacionais (ex: "15 fechados"). DRE e Repasse calculados sobre dados do `resumo_mensal` (base materializados, não tempo real).

### 2026-02-11 Notificacoes via Telegram

**Contexto**: Canal de comunicacao para alertas do sistema.
**Decisao**: Telegram via n8n (bot a ser configurado em fase posterior).
**Alternativas**:
- Email — mais formal mas menos agil
- WhatsApp — custo e complexidade da API
- Slack — equipe nao usa
**Consequencias**: Integracao simples no n8n. Equipe ja usa Telegram no dia-a-dia.
