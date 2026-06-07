-- 025: recategoriza "Exame Biologix" de "Consulta" para "Exame/Diagnóstico".
-- O Biologix é o exame do sono (custo real R$100/un); estava somando dentro de
-- "Consulta" (custo 0) na aba Procedimentos→Categorias, distorcendo a leitura.
-- Idempotente. Não altera custo_fixo (não afeta o resumo_mensal, só o agrupamento).
UPDATE procedimentos
SET categoria = 'Exame/Diagnóstico'
WHERE nome = 'Exame Biologix';
