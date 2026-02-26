-- ============================================================
-- Apaga TODOS os dados de upload (batches + orçamentos + tratamentos).
-- Execute no Supabase SQL Editor quando quiser zerar a base de uploads.
-- Ordem: primeiro as tabelas que referenciam upload_batches, depois upload_batches.
-- ============================================================

DELETE FROM public.orcamentos_fechados;
DELETE FROM public.orcamentos_abertos;
DELETE FROM public.tratamentos_executados;
DELETE FROM public.upload_batches;
