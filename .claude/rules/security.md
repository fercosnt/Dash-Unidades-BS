# Regras de Seguranca

Estas regras sao INVIOLAVEIS e aplicam-se a TODO codigo do projeto.

## Secrets e Credenciais

- NUNCA hardcode secrets, API keys, tokens ou senhas no codigo
- NUNCA commite arquivos .env, .env.local, .env.production
- NUNCA logue secrets, tokens ou PII (dados pessoais) em console ou logs
- Variaveis sensiveis: usar `.env.local` + `process.env.VARIAVEL`
- `SUPABASE_SERVICE_ROLE_KEY` NUNCA deve ser exposta no frontend (sem prefixo `NEXT_PUBLIC_`)
- `N8N_WEBHOOK_SECRET` NUNCA deve ser exposta no frontend

## Autenticacao

- Auth gerenciado pelo Supabase Auth — nao implemente auth customizado
- Admin cria contas de parceiros — sem self-service de cadastro
- Middleware protege rotas: verificar sessao e redirecionar para /login
- Refresh de token: gerenciado pelo middleware do Supabase SSR
- Roles definidos na tabela `profiles` com CHECK constraint: 'admin' ou 'parceiro'

## Autorizacao (RLS)

- RLS ativo em TODAS as tabelas com dados sensiveis ou multi-tenant
- Isolamento por clinica_id no BANCO, nao no codigo da aplicacao
- Testar policies: criar testes de integracao que validem acesso entre clinicas
- Service role (`admin.ts`) apenas para operacoes privilegiadas do backend

## Input Validation

- Validar TODOS os inputs no backend com Zod schemas
- Frontend valida para UX (feedback rapido), backend valida para seguranca
- Nunca confie em dados vindos do cliente — sempre revalidar no servidor
- Sanitizar dados antes de inserir no banco (ex: trim, lowercase email)

## API Routes

- Verificar sessao no INICIO de toda route protegida
- Retornar mensagens de erro genericas em producao — nunca stack traces
- Rate limiting em endpoints publicos
- CORS configurado para dominio do projeto apenas (dash.bslabs.com.br)

## Anti-Patterns de Seguranca

- NUNCA desabilite RLS para "facilitar desenvolvimento" — use service role
- NUNCA exponha service_role_key no frontend
- NUNCA confie em dados do localStorage/cookies sem validacao server-side
- NUNCA renderize HTML nao sanitizado — sempre use bibliotecas de sanitizacao como DOMPurify
