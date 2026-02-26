-- ============================================================
-- Seed: procedimentos (Beauty Smile)
-- Execute uma vez no Supabase SQL Editor (Dashboard do projeto).
-- Não insere se já existir procedimento com o mesmo nome (case-insensitive).
-- ============================================================

INSERT INTO public.procedimentos (nome, codigo_clinicorp, custo_fixo, categoria, ativo)
SELECT v.nome, v.codigo_clinicorp, v.custo_fixo, v.categoria, v.ativo
FROM (VALUES
  -- Preventivo / Diagnóstico
  ('Clareamento dental', NULL, 180.00, 'Estética', true),
  ('Limpeza', NULL, 95.00, 'Preventivo', true),
  ('Profilaxia', NULL, 95.00, 'Preventivo', true),
  ('Aplicação de flúor', NULL, 45.00, 'Preventivo', true),
  ('Consulta inicial', NULL, 120.00, 'Diagnóstico', true),
  ('Retorno', NULL, 60.00, 'Diagnóstico', true),
  ('Reavaliação', NULL, 60.00, 'Diagnóstico', true),
  ('Avaliação ortodôntica', NULL, 150.00, 'Ortodontia', true),
  ('Radiografia panorâmica', NULL, 80.00, 'Diagnóstico', true),
  -- Restauração / Reabilitação
  ('Restauração em resina', NULL, 120.00, 'Restauração', true),
  ('Restauração em porcelana', NULL, 350.00, 'Restauração', true),
  ('Aplicação de resina', NULL, 100.00, 'Restauração', true),
  ('Polimento', NULL, 40.00, 'Restauração', true),
  -- Endodontia
  ('Tratamento de canal', NULL, 450.00, 'Endodontia', true),
  -- Cirurgia
  ('Extração de siso', NULL, 520.00, 'Cirurgia', true),
  ('Extração simples', NULL, 180.00, 'Cirurgia', true),
  ('Bichectomia', NULL, 1200.00, 'Cirurgia', true),
  -- Implante / Prótese
  ('Implante - etapa cirúrgica', NULL, 850.00, 'Implante', true),
  ('Implante - prótese', NULL, 650.00, 'Implante', true),
  ('Prótese total', NULL, 420.00, 'Prótese', true),
  ('Prótese parcial', NULL, 380.00, 'Prótese', true),
  -- Estética dental
  ('Lente de contato dental', NULL, 680.00, 'Estética', true),
  ('Faceta em porcelana', NULL, 580.00, 'Estética', true),
  ('Clareamento a laser', NULL, 420.00, 'Estética', true),
  -- Periodontia
  ('Raspagem', NULL, 220.00, 'Periodontia', true),
  ('Periodontia', NULL, 200.00, 'Periodontia', true),
  -- Ortodontia
  ('Manutenção ortodôntica', NULL, 90.00, 'Ortodontia', true),
  ('Colagem de aparelho', NULL, 150.00, 'Ortodontia', true),
  -- Estética facial
  ('Preenchimento labial', NULL, 580.00, 'Estética facial', true),
  ('Toxina botulínica', NULL, 450.00, 'Estética facial', true),
  ('Botox', NULL, 450.00, 'Estética facial', true),
  ('Harmonização facial', NULL, 800.00, 'Estética facial', true),
  ('Peeling químico', NULL, 220.00, 'Estética facial', true),
  ('Limpeza de pele', NULL, 120.00, 'Estética facial', true)
) AS v(nome, codigo_clinicorp, custo_fixo, categoria, ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.procedimentos p
  WHERE LOWER(TRIM(p.nome)) = LOWER(TRIM(v.nome))
);
