# Fechamento Mensal via Plugin Claude — PRD

**Autor**: Fernando | **Data**: 2026-10-19 | **Status**: Aprovado (2026-10-19) — F1 em implementação
**Nível**: Standard
**Upstream**: refechamento Hirata mar–set/2026 (sessão 2026-10-18/19) — problemas e decisões listados em §1 e §11.

---

## 1. Problema & Contexto

O fechamento mensal hoje é um wizard em `/admin/fechamento` (Upload → Revisão → Fechar). Ele ficou meses sem ser usado e, quando foi retomado, os números estavam errados — e **nada no sistema avisou**. No refechamento do Hirata (mar–set/2026) apareceram, em sequência:

| # | Problema | Efeito | Status |
|---|---|---|---|
| 1 | Sync abortava ao reinserir `upload_batch` do mês (UNIQUE) | jun–out com 1 orçamento/mês; faltavam R$ 88.720 em vendas e todos os pagamentos | corrigido `b46f78f` |
| 2 | Recálculo pós-sync recebia `YYYY-MM-DD` e montava data inválida | `resumo_mensal` nunca era recalculado pelo sync; `sync_logs.recalculo_ok` mentia `true` | corrigido `6113fd7` |
| 3 | Recálculo dependia de cookies (`getConfigVigente`) | não rodava fora de request | corrigido `65d1ff0` |
| 4 | n8n WF3 sem permissão desde a migration 026 | 39 parcelas (R$ 77 mil) presas em `projetado` jul–out; recebido zerado | corrigido `48eaa24` (cron Vercel) |
| 5 | Comissão da dentista só recalcula no clique e contava cortesia como venda | mar defasada; tier errado em set | corrigido `8c5a1be` + recálculo |
| 6 | `data_fechamento` = data de criação do orçamento | Ismar "16/03" dentro de maio | corrigido `b46f78f` |
| 7 | Procedimentos jun–set nunca importados | custo zero em 4 meses | importado manualmente |
| 8 | Despesa "Salário Dentista" não lançada desde fev | DRE BS inflado | lançado manualmente |

O padrão comum: **o fechamento é feito de decisões de julgamento** ("fotobiomodulação tem custo?", "essa linha é duplicada?", "cortesia conta como venda?", "Luciano pagou só isso mesmo?") e **conferências cruzadas** (Clinicorp × banco × Rede). Um wizard rígido não comporta nenhum dos dois: ou prevê o caso, ou deixa o dado entrar errado em silêncio.

**Na voz do operador:** *"Quero fechar o mês sabendo que o que está no sistema bate com o Clinicorp e com a maquininha, decidindo só o que é realmente ambíguo."*

**HMW:** Como podemos tornar o fechamento uma conferência guiada — que cruza as fontes sozinha, pergunta só o ambíguo, lembra as decisões e deixa rastro — sem tirar do sistema o papel de fonte de dados e visualização?

---

## 2. Decisão de arquitetura

**O sistema continua sendo a fonte de dados e a visualização** (dashboards, conta corrente, portal do parceiro, sync diário). **O fechamento sai da tela e vai para um plugin do Claude** (`bs-fechamento`), usado por quem fecha: **Fernando e Duda (supervisora)**.

| Fica no sistema | Vai para o plugin |
|---|---|
| Sync Clinicorp diário + auto-recebimento de parcelas (cron) | Conferência Clinicorp × banco (orçamentos, pagamentos) |
| Cálculo do resumo, conta corrente, DREs, dashboards | Importar e revisar a planilha "Procedimentos Executados" |
| Portal do parceiro (RLS) | Despesas do mês, comissão da dentista, indicações |
| **Novo:** tela de status do fechamento (só leitura) + alerta de sync com erro | Conciliação com a Rede (recebido real, taxa real) |
| **Novo:** API de fechamento (o plugin escreve só por ela) | Revisão final + fechar o mês |
| Sai: wizard Upload/Revisão/Fechamento | — |

**Princípio:** o plugin **orquestra e coleta decisões**; as **regras de negócio e as escritas** ficam no sistema (rotas/RPCs com validação). Nada de SQL solto em produção a partir do plugin.

---

## 3. Objetivos & Métricas

**Primária:** todo mês fechado tem orçamentos, pagamentos e custo de procedimentos **batendo com a fonte** (Clinicorp/planilha), com divergências zeradas ou justificadas no registro do fechamento.

**Secundárias:**
- Fechar um mês da unidade em **≤ 30 min** de conversa (hoje: horas + investigação).
- Falha de sync/recálculo **visível no admin em até 24 h** (hoje: invisível por 4 meses).
- Duda fecha um mês **sem precisar do Fernando**.

**Guardrails:**
- Nenhuma escrita sem prévia + OK explícito de quem está fechando.
- Mês fechado não muda por sync nem por plugin sem **reabrir** (registrado).
- Credencial `service_role` **nunca** sai do servidor (não vai para o laptop da Duda).

---

## 4. Personas

- **Fernando (admin):** fecha, define regras novas, aprova exceções.
- **Duda (supervisora, admin):** executa o fechamento mensal de rotina; escala ao Fernando o que for regra nova.
- **Parceiro (Hirata):** só visualiza — inalterado.

---

## 5. Fluxo do fechamento (checklist do plugin)

Comando: `/fechar-unidade <clínica> <YYYY-MM>`. Cada passo mostra o estado; todo passo com escrita faz **prévia → OK → grava → verifica**.

| Passo | O que confere | O que grava | Fonte |
|---|---|---|---|
| 0. Saúde | último sync ok? recálculo ok? mês já fechado? | — | `sync_logs` via API |
| 1. Orçamentos | aprovados no Clinicorp (por `ApprovedDate`) × `orcamentos_fechados` | re-sync do mês se faltar | Clinicorp + API |
| 2. Pagamentos | pagamentos do mês × `pagamentos`; alerta de venda com < 30% pago | re-sync se faltar | Clinicorp + API |
| 3. Procedimentos | planilha do mês → mapeamento ao catálogo; pergunta só os ambíguos (custo desconhecido, duplicata provável, rótulo trocado) | substitui `tratamentos_executados` do mês (atômico) | `.xlsx` local + API |
| 4. Indicações | "Como conheceu?" da planilha de orçamentos; pede médico se for indicação | `medico_indicador_id` | `.xlsx` + API |
| 5. Despesas | recorrentes do mês lançadas? (salário dentista etc.) | `despesas_operacionais` | API |
| 6. Comissão dentista | recalcula com a regra vigente (cortesia ≠ venda) | `comissoes_dentista` | API |
| 7. Rede | vendas cartão Clinicorp × vendas Rede (PV da unidade); recebido Rede × parcelas | v1: só relatório | Rede + API |
| 8. Revisão | resumo do mês (fat., custos, líquido, 60/40, recebido, inadimplência, DRE BS) | — | API |
| 9. Fechar | — | `fechamentos` (snapshot + decisões) + trava o mês | API |

**Memória de decisões compartilhada:** regras como "fotobiomodulação = sem custo", "profilaxia Airflow = Limpeza R$ 300", "cortesia conta custo" ficam numa tabela **no banco** (`regras_procedimento`), não em arquivo local — assim Fernando e Duda usam as mesmas regras, e o mapeamento do mês seguinte já vem pronto.

---

## 6. Requisitos Funcionais

**Sistema (API de fechamento):**
- RF-1 Rotas `POST/GET /api/fechamento/*` autenticadas por `Authorization: Bearer <access_token Supabase>` do usuário + `is_admin()`. Toda escrita registra `user_id`.
- RF-2 `GET status?clinica&mes` → checklist (passos 0–9) com o estado de cada item.
- RF-3 `POST procedimentos` → recebe linhas já mapeadas e **substitui** as do mês em transação (idempotente; reimportar não duplica).
- RF-4 `POST despesas`, `POST comissao-dentista/calcular`, `POST resumo/recalcular` (reusa `calcularEPersistirResumo`).
- RF-5 `POST fechar` / `POST reabrir` **por clínica** (hoje `fecharMes` fecha todas as clínicas de uma vez) + grava `fechamentos` com snapshot do resumo e as decisões tomadas.
- RF-6 `GET/POST regras-procedimento` (texto/padrão → procedimento + custo, ou "ignorar").
- RF-7 Sync e auto-recebimento respeitam mês fechado (sync já respeita; manter).

**Sistema (visualização):**
- RF-8 `/admin/fechamento` vira **status** só leitura: matriz clínica × mês com o checklist, quem fechou e quando, link para o registro.
- RF-9 Banner no admin quando o último sync de alguma clínica falhou ou `recalculo_ok = false`.

**Plugin `bs-fechamento`:**
- RF-10 Command `/fechar-unidade`, skill `fechamento-unidade` (orquestra §5), skill `importar-procedimentos` (lê `.xlsx`, aplica `regras_procedimento`, separa ambíguos), skill `conciliar-rede`.
- RF-11 Agente `revisor-procedimentos` (só leitura): propõe mapeamento linha a linha com confiança; nunca grava.
- RF-12 MCP próprio `bs-dash`: cliente fino da API de fechamento; login com e-mail/senha do admin (token guardado localmente, como o MCP da Rede faz).

---

## 7. Requisitos Não-Funcionais

- Escritas idempotentes (reexecutar um passo não duplica nada).
- Plugin funciona no Mac do Fernando e da Duda com **instalação + login**, sem clonar o repositório.
- Mensagens e prévias em português, com valores em R$.

---

## 8. Considerações Técnicas

### Novas tabelas
- `fechamentos (id, clinica_id, mes_referencia, status, fechado_por, fechado_em, reaberto_por, reaberto_em, snapshot jsonb, decisoes jsonb, divergencias jsonb)` — fonte de verdade do "mês fechado" por clínica; `resumo_mensal.fechado_em` passa a ser espelho (compatibilidade com `isMesFechado`).
- `regras_procedimento (id, clinica_id null=global, padrao text, procedimento_id null, ignorar bool, observacao, criado_por, criado_em)`.

### Credenciais Clinicorp e Rede — **decidido: Opção A (MCPs locais)**
O plugin usa os plugins `clinicorp` e `rede` já instalados no Claude do Fernando e da Duda para **ler** as fontes. Escritas no sistema continuam só pela API de fechamento (login do usuário).

### Rede
- PV por unidade já configurado (`Hirata = 106119095`, `Matriz = 96504463`) — contas e estabelecimentos separados.
- v1: relatório de conciliação (venda cartão no Clinicorp × venda na Rede; recebido na Rede × `parcelas_cartao` recebidas).
- v2: `parcelas_cartao` passa a virar `recebido` pelo **depósito real** da Rede (não mais "chegou o mês"), e a taxa real por pagamento vem do MDR da Rede (substitui a tabela `taxas_cartao_reais` como fonte primária).

---

## 9. Fases

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **F1 — Base no sistema** | Tabelas `fechamentos` e `regras_procedimento`; API de fechamento (RF-1..7) com Bearer; banner de sync (RF-9) | testes das rotas; fechar/reabrir por clínica funcionando |
| **F2 — Plugin v1** | `bs-fechamento` com passos 0–6, 8, 9; MCP `bs-dash` | **piloto: fechar outubro/2026 do Hirata** pelo plugin, com Fernando |
| **F3 — Tela de status** | `/admin/fechamento` só leitura (RF-8); remove o wizard antigo | wizard removido sem quebrar upload histórico |
| **F4 — Rede** | passo 7 (relatório) → v2 (recebido e taxa reais) | conciliação de um mês fechado bate com o extrato Rede |
| **F5 — Duda** | instalação no Mac da Duda + guia curto | Duda fecha novembro sozinha |

---

## 10. Decisões das questões em aberto (2026-10-19)

1. **Credenciais:** Opção A — Duda já tem os plugins Clinicorp e Rede.
2. **Duda admin:** ainda não tem usuário; criar em Configurações → Usuários (papel admin) antes da F5.
3. **Piloto:** outubro/2026 do Hirata — Duda fecha pelo plugin e envia a planilha de procedimentos.
4. **Regra dos 30%:** só alerta no fechamento (passo 2), não no sync.
5. **Despesas recorrentes por unidade:** Salário Dentista (R$ 6.500), Assinatura Clinicorp, Mensalidade Biologix, Insumos para Atendimento — valores informados no fechamento (o plugin pergunta e marca como recorrente).

---

## 11. Decisões já travadas (refechamento 2026-10-18/19)

- Salário Dentista (Dra Beatriz) = **R$ 6.500/mês** em despesas operacionais; comissão da dentista é 100% BS (fora do split).
- **Fotobiomodulação = sem custo**; linhas sem custo (fotos, pedido de RX, apresentação) não entram.
- Alinhador da Maitê: R$ 5.750 **uma vez** (ago/26); entregas seguintes sem custo.
- Duplicata evidente na planilha → conta uma vez (ex.: Yang 18/09).
- Seguir a planilha mesmo com rótulo suspeito, salvo decisão explícita (ex.: Fabio ago/26 = Apneia).
- **Cortesia (R$ 0) não conta como venda** para o tier da comissão; cortesia **conta custo** de procedimento.
- Indicação sem médico informado = sem indicação (sem comissão médica).
- Venda aprovada com < 30% pago entra com valor cheio e aparece como inadimplência (Luciano, Thiago, Edna).
