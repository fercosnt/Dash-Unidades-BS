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
**Decisao**: Next.js 14 (App Router) + Supabase + TypeScript + Tailwind CSS + @beautysmile/design-system.
**Alternativas**:
- Vite + Express + PostgreSQL — mais controle, mas mais setup e infra para gerenciar
- Remix — bom DX mas ecossistema menor
**Consequencias**: Deploy simplificado via Vercel, auth e DB gerenciados, RLS nativo. Custo R$0-5/mes no MVP.

### 2026-02-11 Multi-tenancy via RLS

**Contexto**: Precisamos isolar dados financeiros entre clinicas parceiras.
**Decisao**: Row Level Security no Supabase com funcoes SECURITY DEFINER. Coluna tenant: `clinica_id`.
**Alternativas**:
- Filtro no codigo da aplicacao — fragil, um bug expoe dados financeiros
- Schema por tenant — complexo demais para 1-3 clinicas
- Banco separado por tenant — custo proibitivo
**Consequencias**: Seguranca no nivel do banco. Mesmo com bug no frontend, dados ficam isolados. Admin ve tudo, parceiro ve so sua clinica.

### 2026-02-11 UI com @beautysmile/design-system (Admin Theme)

**Contexto**: Necessidade de interface consistente com identidade Beauty Smile.
**Decisao**: Usar pacote publico @beautysmile/design-system com Admin Theme (Deep Blue #0A2463).
**Alternativas**:
- Tailwind puro + shadcn/ui — flexivel mas sem identidade visual BS
- Material UI — pesado, estilo diferente
**Consequencias**: 26+ componentes prontos, templates admin (Login, Dashboard, CRUD, List, Detail, Settings). Glass morphism disponivel para diferenciar visao parceiro.

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

### 2026-02-11 Notificacoes via Telegram

**Contexto**: Canal de comunicacao para alertas do sistema.
**Decisao**: Telegram via n8n (bot a ser configurado em fase posterior).
**Alternativas**:
- Email — mais formal mas menos agil
- WhatsApp — custo e complexidade da API
- Slack — equipe nao usa
**Consequencias**: Integracao simples no n8n. Equipe ja usa Telegram no dia-a-dia.
