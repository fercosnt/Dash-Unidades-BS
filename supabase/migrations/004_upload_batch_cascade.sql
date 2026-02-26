-- ============================================================
-- ON DELETE CASCADE: ao excluir um upload_batch, exclui os registros
-- em orcamentos_fechados, orcamentos_abertos e tratamentos_executados.
-- Assim o Table Editor e qualquer DELETE em upload_batches funcionam sem erro.
-- ============================================================

ALTER TABLE public.orcamentos_fechados
  DROP CONSTRAINT IF EXISTS orcamentos_fechados_upload_batch_id_fkey,
  ADD CONSTRAINT orcamentos_fechados_upload_batch_id_fkey
    FOREIGN KEY (upload_batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;

ALTER TABLE public.orcamentos_abertos
  DROP CONSTRAINT IF EXISTS orcamentos_abertos_upload_batch_id_fkey,
  ADD CONSTRAINT orcamentos_abertos_upload_batch_id_fkey
    FOREIGN KEY (upload_batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;

ALTER TABLE public.tratamentos_executados
  DROP CONSTRAINT IF EXISTS tratamentos_executados_upload_batch_id_fkey,
  ADD CONSTRAINT tratamentos_executados_upload_batch_id_fkey
    FOREIGN KEY (upload_batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;
