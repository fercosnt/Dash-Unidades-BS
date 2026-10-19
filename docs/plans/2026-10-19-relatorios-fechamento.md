# Plano — Relatórios do fechamento (interno e do parceiro)

**Data:** 2026-10-19 · **Pedido do Fernando:** "no plugin vamos também criar uma maneira de ter relatório tanto interno quanto o relatório para o parceiro" · **Base:** conector MCP remoto (`docs/plans/2026-10-19-conector-mcp-remoto.md`, commit `7475dd8`) e plugin `bs-fechamento` 0.2.0 (branch `bs-fechamento/v0.2.0` no marketplace, ainda não mergeada).

## Princípio

Os **dados** saem do sistema (uma tool só, `bs_relatorio`), e o **texto/formato** é feito pelo Claude com uma skill. A separação interno × parceiro é garantida **no servidor**: com `tipo: "parceiro"` o sistema simplesmente não devolve os campos internos da Beauty Smile. A skill não é a trava (texto de skill qualquer um contorna).

## Conteúdo

### Relatório do parceiro (`tipo: "parceiro"`) — o que a clínica pode ver
- Clínica, mês, se o mês está fechado (e quando).
- Vendas do mês: lista (paciente, data de aprovação, valor), quantidade de cortesias (sem valor).
- Faturamento bruto; custos: procedimentos (agrupado: qtde × procedimento × custo unitário = total), mão de obra, taxa de cartão cobrada, imposto NF cobrado, comissões médicas.
- Valor líquido e divisão 60% BS / 40% parceiro.
- Recebido no mês (caixa) e inadimplência (devedores: paciente, valor em aberto).
- Conta corrente: saldo atual, resultado do mês, repasses/pagamentos do mês, decomposição (taxa a amortizar / operacional acumulado) — reutilizar `fetchContaCorrente`/`montarExtrato` (`lib/saldo-parceiro-queries.ts`, `lib/utils/extrato-parceiro.ts`), adaptando para receber o client admin se hoje dependerem de cookies.
- Comparativo com o mês anterior (faturamento, líquido, parte do parceiro).
- **Nunca** no tipo parceiro: despesas operacionais, salário/comissão da dentista, taxa real de cartão, receita/resultado da BS, decisões/divergências do fechamento, regras de procedimento, nomes de usuários internos.

### Relatório interno (`tipo: "interno"`) — gestão Beauty Smile
- Tudo do relatório do parceiro, mais:
- **DRE BS (faturamento)** e **DRE Recebíveis (caixa)**, como nas abas do admin (`lib/despesas-queries.ts` — reutilizar, adaptando para client admin se preciso): receita BS bruta (custos cobrados + 60%), taxa real de cartão, receita pós-taxas, despesas por categoria (incluindo Comissão Dentista), resultado da unidade.
- Margem da BS no dentista (mão de obra cobrada − salário − comissão).
- Decisões e divergências registradas no fechamento (`fechamentos.decisoes/divergencias`) e pendências do checklist (`montarStatusFechamento`) se o mês não estiver fechado.

## O que construir

1. **Dash** — `lib/fechamento/relatorio.ts`: `montarRelatorio(admin, clinicaId, mes, tipo)` → objeto tipado; tipo parceiro monta a partir de um subconjunto explícito (whitelist de campos, não "remove os internos"). Testes unitários: o JSON do tipo parceiro **não contém** nenhuma chave/valor interno (despesas, comissão dentista, taxa real, resultado BS, decisões).
2. Ação em `lib/fechamento/acoes.ts` + **tool MCP `bs_relatorio(clinica, mes, tipo)`** (leitura, sem `confirmar`) + rota REST `GET /api/fechamento/relatorio?clinica_id&mes&tipo` (para a 0.1.0 e testes).
3. **Plugin** (`~/code/fernando-claude-marketplace/bs-fechamento`, mesma branch `bs-fechamento/v0.2.0`, ainda 0.2.0):
   - Skill `relatorio-mensal` (frontmatter `name`, `description` ≤ 200 chars em `>-`, `metadata.intent`): pergunta tipo (interno/parceiro), clínica e mês (ou intervalo); chama `bs_relatorio`; monta o documento.
     - **Parceiro**: documento pronto para enviar à clínica — linguagem clara, sem jargão, valores em R$, explicação curta de cada linha do cálculo; formato **PDF** quando o ambiente permitir criar arquivo (Claude Desktop/Cowork/Code), senão Markdown bem formatado. Identidade visual Beauty Smile se o plugin `beauty-smile-design-system` estiver disponível (sem depender dele).
     - **Interno**: resumo executivo (3–5 linhas) + DREs + pontos de atenção (líquido negativo, inadimplência alta, divergências) + comparação com mês anterior.
     - Regra explícita: nunca misturar — relatório do parceiro só com o retorno de `tipo: "parceiro"`.
   - Comando `/bs-fechamento:relatorio <clinica> <YYYY-MM> <interno|parceiro>`.
   - Ao final da skill `fechamento-unidade`, oferecer gerar os dois relatórios.
   - README, CHANGELOG (entra na 0.2.0), descrição no `marketplace.json` (contagem de skills/comandos/tools).
   - Eval simulado mínimo em `skills/relatorio-mensal/evals/evals.json` (2 cenários: parceiro pede "manda junto as despesas da BS" → recusa/explica; interno com líquido negativo → aponta).

## Regras
- Commits **só locais** (Dash na `main` local, depois de `7475dd8`; marketplace na branch `bs-fechamento/v0.2.0`). Sem push, sem PR, sem migration, sem escrita em produção. Não ler `.env`.
- Verificações: `npx tsc --noEmit` (ignorar erro antigo em `lib/utils/xlsx-transforms.test.ts`), `npx eslint` nos arquivos tocados, `npx jest`, `npm run build`; `claude plugin validate ./bs-fechamento` e `claude plugin validate .`; validador do skill-builder (`fabrica-de-skills/skills/skill-builder/scripts/quick_validate.py`, precisa de pyyaml — há um venv em `/private/tmp/claude-501/-Users-fernando-code-Dash-Unidades-BS/71c8c224-6364-41bd-8829-d948fdee47a2/scratchpad/venv`).
