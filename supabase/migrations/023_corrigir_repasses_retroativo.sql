-- 023: corrigir histórico da Hirata para o modelo de conta única.
-- Os 3 repasses (fev/mar/abr) eram debt-abatement (nenhum dinheiro saiu p/ o parceiro):
-- cada abatimento estava amarrado a um repasse (repasse_id preenchido). Soma = 3.178,40 = valor_pago.
-- No modelo único, a taxa de implementação é a abertura da conta (saldo inicial = -valor_total)
-- e as operações auto-amortizam. Logo: remover repasses/abatimentos e zerar valor_pago.
DELETE FROM abatimentos_debito
WHERE debito_id IN (SELECT id FROM debito_parceiro
                    WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019');

DELETE FROM repasses_mensais
WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019';

UPDATE debito_parceiro
SET valor_pago = 0, status = 'ativo'
WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019'
  AND descricao = 'Taxa de Implementação';
