-- ============================================================
-- BEAUTY SMILE PARTNERS — 021: Comissão dentista única por dentista
-- ============================================================
-- Problema: a constraint UNIQUE (clinica_id, mes_referencia) permitia apenas
-- UMA comissão por clínica/mês. Ao calcular a comissão de uma 2ª dentista da
-- mesma clínica, o upsert (onConflict clinica_id,mes_referencia) SOBRESCREVIA
-- a comissão da 1ª dentista.
--
-- Correção: a unicidade passa a considerar a dentista, permitindo múltiplas
-- dentistas por clínica/mês sem sobrescrever.

ALTER TABLE comissoes_dentista
  DROP CONSTRAINT IF EXISTS comissoes_dentista_clinica_id_mes_referencia_key;

ALTER TABLE comissoes_dentista
  ADD CONSTRAINT comissoes_dentista_clinica_dentista_mes_key
  UNIQUE (clinica_id, dentista_id, mes_referencia);
