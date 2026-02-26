# Dash Unidades BS

Dashboard multi-tenant para gestão financeira das clínicas parceiras da Beauty Smile. Upload de planilhas (Clinicorp), cálculo do split 60/40, controle de pagamentos e inadimplência.

**Stack:** Next.js 14 (App Router) · Supabase · TypeScript · Tailwind CSS

---

## Repositório

- **GitHub:** [https://github.com/Lu1zHenr1qu3/Dash-Unidades-BS](https://github.com/Lu1zHenr1qu3/Dash-Unidades-BS)

---

## Pré-requisitos

- Node.js 18+
- Conta e projeto no [Supabase](https://supabase.com)
- (Opcional) Docker, para Supabase local
- (Opcional) n8n, para webhooks de automação

---

## Instalação

```bash
git clone https://github.com/Lu1zHenr1qu3/Dash-Unidades-BS.git
cd Dash-Unidades-BS
npm install --legacy-peer-deps
cp .env.example .env.local
```

Edite `.env.local` e preencha as variáveis (veja seção **Variáveis de ambiente** abaixo).

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

Use `.env.example` como modelo. Nunca commite `.env` ou `.env.local`.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anônima (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role (apenas server-side) |
| `NEXT_PUBLIC_APP_URL` | Sim | URL do app (ex.: `http://localhost:3000`) |
| `N8N_WEBHOOK_URL` | Não | URL do webhook n8n (server-side) |
| `N8N_WEBHOOK_SECRET` | Não | Secret compartilhado com o n8n |

---

## Banco de dados

- **Supabase na nuvem:** crie um projeto em [supabase.com](https://supabase.com), rode as migrations pelo SQL Editor (pasta `supabase/migrations/`).
- **Supabase local:** com Docker instalado, use `npx supabase start` e `npx supabase db reset`.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint + checagem TypeScript |
| `npm test` | Testes Jest |
| `npm run test:e2e` | Testes E2E (Playwright) |

---

## Estrutura principal

```
app/
├── (auth)           # Login
├── admin/           # Painel admin (Beauty Smile)
│   ├── dashboard/   # KPIs, gráficos, ranking
│   ├── clinicas/     # CRUD e drill-down por clínica
│   ├── upload/       # Upload de planilhas XLSX
│   ├── inadimplencia/
│   ├── pagamentos/
│   └── configuracoes/  # Clínicas, procedimentos, médicos, financeiro
├── parceiro/        # Painel parceiro (por clínica, RLS)
├── api/             # API Routes (upload, resumo, pagamentos, etc.)
```

---

## Segurança

- **RLS** ativo em todas as tabelas multi-tenant.
- Valores monetários em `DECIMAL(12,2)`; percentuais em `DECIMAL(5,2)`.
- Nenhum secret em código; uso apenas de variáveis de ambiente.
- Validação de inputs no backend com Zod.

---

## Licença

Projeto privado — Beauty Smile.
