-- ============================================================
-- SEED: Dados de teste realistas — 7 meses, 2 clínicas, 4+ médicos
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- 0. Limpar dados anteriores (preserva configurações e auth)
DELETE FROM parcelas_cartao;
DELETE FROM pagamentos;
DELETE FROM tratamentos_executados;
DELETE FROM orcamentos_abertos;
DELETE FROM orcamentos_fechados;
DELETE FROM upload_batches;
DELETE FROM resumo_mensal;
DELETE FROM medicos_indicadores;

-- ============================================================
-- 1. CLÍNICAS (upsert para não duplicar)
-- ============================================================
INSERT INTO clinicas_parceiras (id, nome, cnpj, responsavel, email, telefone, custo_mao_de_obra, percentual_split, ativo)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Clínica Odonto Premium', '12.345.678/0001-01', 'Dr. Ricardo Mendes', 'contato@odontopremium.com.br', '(11) 98765-4321', 3500.00, 40.00, true),
  ('a1000000-0000-0000-0000-000000000002', 'Clínica Sorriso Perfeito', '98.765.432/0001-02', 'Dra. Camila Torres', 'contato@sorrisoperfeito.com.br', '(11) 91234-5678', 4200.00, 40.00, true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome, cnpj = EXCLUDED.cnpj, responsavel = EXCLUDED.responsavel,
  email = EXCLUDED.email, telefone = EXCLUDED.telefone,
  custo_mao_de_obra = EXCLUDED.custo_mao_de_obra, ativo = EXCLUDED.ativo;

-- ============================================================
-- 2. MÉDICOS INDICADORES (2 por clínica + 1 extra)
-- ============================================================
INSERT INTO medicos_indicadores (id, nome, clinica_id, percentual_comissao, ativo) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Dr. André Figueiredo',   'a1000000-0000-0000-0000-000000000001', 10.00, true),
  ('b1000000-0000-0000-0000-000000000002', 'Dra. Beatriz Almeida',  'a1000000-0000-0000-0000-000000000001', 10.00, true),
  ('b1000000-0000-0000-0000-000000000003', 'Dr. Felipe Nascimento', 'a1000000-0000-0000-0000-000000000002', 10.00, true),
  ('b1000000-0000-0000-0000-000000000004', 'Dra. Juliana Ribeiro',  'a1000000-0000-0000-0000-000000000002', 10.00, true),
  ('b1000000-0000-0000-0000-000000000005', 'Dr. Marcos Tavares',    'a1000000-0000-0000-0000-000000000002', 8.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. PROCEDIMENTOS
-- ============================================================
INSERT INTO procedimentos (id, nome, custo_fixo, categoria, ativo) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Lente de Contato Dental',        180.00, 'Estética', true),
  ('c1000000-0000-0000-0000-000000000002', 'Faceta de Porcelana',            220.00, 'Estética', true),
  ('c1000000-0000-0000-0000-000000000003', 'Clareamento a Laser',            90.00,  'Estética', true),
  ('c1000000-0000-0000-0000-000000000004', 'Implante Dentário',              350.00, 'Implantodontia', true),
  ('c1000000-0000-0000-0000-000000000005', 'Prótese sobre Implante',         280.00, 'Implantodontia', true),
  ('c1000000-0000-0000-0000-000000000006', 'Extração de Siso',              120.00, 'Cirurgia', true),
  ('c1000000-0000-0000-0000-000000000007', 'Tratamento de Canal',            150.00, 'Endodontia', true),
  ('c1000000-0000-0000-0000-000000000008', 'Restauração Resina Composta',    60.00,  'Dentística', true),
  ('c1000000-0000-0000-0000-000000000009', 'Limpeza e Profilaxia',           40.00,  'Prevenção', true),
  ('c1000000-0000-0000-0000-000000000010', 'Coroa de Porcelana',            200.00, 'Prótese', true)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, custo_fixo = EXCLUDED.custo_fixo, categoria = EXCLUDED.categoria;

-- ============================================================
-- 4. CONFIGURAÇÃO FINANCEIRA
-- ============================================================
INSERT INTO configuracoes_financeiras (id, taxa_cartao_percentual, imposto_nf_percentual, percentual_beauty_smile, vigencia_inicio)
VALUES ('d1000000-0000-0000-0000-000000000001', 3.50, 6.00, 60.00, '2025-01-01')
ON CONFLICT (id) DO UPDATE SET
  taxa_cartao_percentual = EXCLUDED.taxa_cartao_percentual,
  imposto_nf_percentual = EXCLUDED.imposto_nf_percentual;

-- ============================================================
-- 5. UPLOAD BATCHES (7 meses × 2 clínicas × 3 tipos = 42 batches)
-- ============================================================
-- Meses: Ago/2025 a Fev/2026
-- Padrão: Ago=bom, Set=muito bom, Out=médio, Nov=ruim, Dez=muito ruim, Jan=realista, Fev=realista

DO $$
DECLARE
  c_id UUID;
  meses DATE[] := ARRAY['2025-08-01','2025-09-01','2025-10-01','2025-11-01','2025-12-01','2026-01-01','2026-02-01'];
  tipos TEXT[] := ARRAY['orcamentos_fechados','orcamentos_abertos','tratamentos_executados'];
  clinicas UUID[] := ARRAY['a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002'];
  m DATE;
  t TEXT;
BEGIN
  FOREACH c_id IN ARRAY clinicas LOOP
    FOREACH m IN ARRAY meses LOOP
      FOREACH t IN ARRAY tipos LOOP
        INSERT INTO upload_batches (clinica_id, mes_referencia, tipo, arquivo_nome, total_registros, status)
        VALUES (c_id, m, t::tipo_planilha, 'seed_' || t || '_' || to_char(m, 'YYYY-MM') || '.xlsx', 0, 'concluido')
        ON CONFLICT (clinica_id, mes_referencia, tipo) DO UPDATE SET status = 'concluido';
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 6. ORÇAMENTOS FECHADOS
-- ============================================================
-- Nomes variados de pacientes
-- Padrão de meses:
--   Ago/2025: BOM         (~R$180k faturamento total entre 2 clínicas)
--   Set/2025: MUITO BOM   (~R$260k)
--   Out/2025: MÉDIO       (~R$120k)
--   Nov/2025: RUIM        (~R$65k)
--   Dez/2025: MUITO RUIM  (~R$35k)
--   Jan/2026: REALISTA    (~R$145k)
--   Fev/2026: REALISTA    (~R$155k)

-- ── Clínica 1: Odonto Premium ──

-- Ago/2025 — BOM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2025-08-01','Ana Carolina Ferreira',18500.00,18500.00,'quitado','2025-08-03','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Bruno Henrique Costa',12800.00,12800.00,'quitado','2025-08-05',NULL),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Carla Mendonça Silva',22000.00,15000.00,'parcial','2025-08-07','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Diego Ramalho Santos',8500.00,8500.00,'quitado','2025-08-10',NULL),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Eliane Gomes Pereira',15200.00,0.00,'em_aberto','2025-08-12','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Fernando Augusto Lima',9800.00,9800.00,'quitado','2025-08-15',NULL),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Gabriela Ramos Diniz',6700.00,3000.00,'parcial','2025-08-18','b1000000-0000-0000-0000-000000000002');

-- Set/2025 — MUITO BOM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2025-09-01','Helena Cristina Duarte',32000.00,32000.00,'quitado','2025-09-02','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Igor Nogueira Braga',25500.00,25500.00,'quitado','2025-09-04',NULL),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Juliana Macedo Teixeira',18700.00,18700.00,'quitado','2025-09-06','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Kevin Martins de Souza',14200.00,14200.00,'quitado','2025-09-09',NULL),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Larissa Fernanda Rocha',21000.00,10000.00,'parcial','2025-09-11','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Marcelo Vieira Pinto',11800.00,11800.00,'quitado','2025-09-14',NULL),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Natália de Almeida Cruz',8300.00,8300.00,'quitado','2025-09-17','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Otávio Campos Leal',5900.00,5900.00,'quitado','2025-09-20',NULL);

-- Out/2025 — MÉDIO
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2025-10-01','Patrícia de Oliveira Lopes',14500.00,14500.00,'quitado','2025-10-02',NULL),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Rafael Antunes Barros',11200.00,5000.00,'parcial','2025-10-05','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Sandra Maia Correia',8900.00,8900.00,'quitado','2025-10-08',NULL),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Thiago Rezende Farias',6200.00,0.00,'em_aberto','2025-10-12','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Úrsula Batista Neves',19500.00,19500.00,'quitado','2025-10-15',NULL);

-- Nov/2025 — RUIM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2025-11-01','Vanessa Cardoso Prado',12000.00,4000.00,'parcial','2025-11-03','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2025-11-01','William Soares Machado',9500.00,9500.00,'quitado','2025-11-06',NULL),
('a1000000-0000-0000-0000-000000000001','2025-11-01','Ximena Borges de Assis',5800.00,0.00,'em_aberto','2025-11-10',NULL);

-- Dez/2025 — MUITO RUIM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2025-12-01','Yasmin Freitas Cavalcanti',7200.00,3000.00,'parcial','2025-12-04',NULL),
('a1000000-0000-0000-0000-000000000001','2025-12-01','Zé Carlos Monteiro',4500.00,0.00,'em_aberto','2025-12-08','b1000000-0000-0000-0000-000000000002');

-- Jan/2026 — REALISTA
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2026-01-01','Amanda Cristina Lopes',16800.00,16800.00,'quitado','2026-01-03','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Bernardo Henrique Vaz',11500.00,11500.00,'quitado','2026-01-06',NULL),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Cecília Drummond Faria',21300.00,12000.00,'parcial','2026-01-09','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Daniel Moreira Peixoto',7900.00,7900.00,'quitado','2026-01-13',NULL),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Eduarda Sampaio Reis',13200.00,0.00,'em_aberto','2026-01-16','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Fábio Massao Sakuma',5400.00,5400.00,'quitado','2026-01-20',NULL);

-- Fev/2026 — REALISTA
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000001','2026-02-01','Giovana Lacerda Bastos',19500.00,19500.00,'quitado','2026-02-02','b1000000-0000-0000-0000-000000000002'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Hugo Leonardo Amaral',14800.00,14800.00,'quitado','2026-02-05',NULL),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Isabella Morais Cunha',24500.00,15000.00,'parcial','2026-02-07','b1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','João Pedro Guimarães',8200.00,8200.00,'quitado','2026-02-10',NULL),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Karina Oliveira Braga',11600.00,0.00,'em_aberto','2026-02-13',NULL),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Lucas Andrade Fonseca',6300.00,6300.00,'quitado','2026-02-16','b1000000-0000-0000-0000-000000000002');

-- ── Clínica 2: Sorriso Perfeito ──

-- Ago/2025 — BOM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2025-08-01','Mariana Souza Bezerra',20500.00,20500.00,'quitado','2025-08-02','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Nelson Dias Carneiro',15300.00,15300.00,'quitado','2025-08-05',NULL),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Olívia Reis Magalhães',28000.00,20000.00,'parcial','2025-08-08','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Paulo Sérgio Araújo',9200.00,9200.00,'quitado','2025-08-11',NULL),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Queila Santana Borba',11800.00,0.00,'em_aberto','2025-08-14','b1000000-0000-0000-0000-000000000005'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Rodrigo Motta Fontes',7400.00,7400.00,'quitado','2025-08-17',NULL);

-- Set/2025 — MUITO BOM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2025-09-01','Samara Bittencourt Viana',35000.00,35000.00,'quitado','2025-09-01','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Tiago Moreira Lins',19800.00,19800.00,'quitado','2025-09-04',NULL),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Valéria Pinheiro Dantas',27500.00,27500.00,'quitado','2025-09-07','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Wagner Costa Oliveira',16200.00,16200.00,'quitado','2025-09-10',NULL),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Xuxa Maria Gonçalves',12400.00,6000.00,'parcial','2025-09-13','b1000000-0000-0000-0000-000000000005'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Yago Ferreira Siqueira',9100.00,9100.00,'quitado','2025-09-16',NULL),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Zilda Aparecida Luz',5500.00,5500.00,'quitado','2025-09-19',NULL);

-- Out/2025 — MÉDIO
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2025-10-01','Aline Tavares Campos',16800.00,16800.00,'quitado','2025-10-03','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Breno Carvalho Dias',10500.00,5000.00,'parcial','2025-10-06',NULL),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Cíntia Ramos Barbosa',7800.00,7800.00,'quitado','2025-10-09','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Danilo Souza Medeiros',24000.00,0.00,'em_aberto','2025-10-13',NULL);

-- Nov/2025 — RUIM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2025-11-01','Estela Vieira Franco',14500.00,14500.00,'quitado','2025-11-04','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2025-11-01','Felipe de Paula Rocha',8200.00,0.00,'em_aberto','2025-11-08',NULL),
('a1000000-0000-0000-0000-000000000002','2025-11-01','Graziela Nunes Pires',4800.00,4800.00,'quitado','2025-11-12','b1000000-0000-0000-0000-000000000005');

-- Dez/2025 — MUITO RUIM
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2025-12-01','Henrique Marques Teles',9800.00,4000.00,'parcial','2025-12-05','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2025-12-01','Ivana Lopes Cordeiro',5200.00,0.00,'em_aberto','2025-12-10',NULL);

-- Jan/2026 — REALISTA
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2026-01-01','Josué Martins Correia',22500.00,22500.00,'quitado','2026-01-02','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Kelly Aparecida Torres',13800.00,13800.00,'quitado','2026-01-05',NULL),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Leonardo Azevedo Gomes',17200.00,8000.00,'parcial','2026-01-08','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Melissa Ramos Britto',9500.00,9500.00,'quitado','2026-01-12',NULL),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Nicolas Freitas Alencar',6800.00,0.00,'em_aberto','2026-01-15','b1000000-0000-0000-0000-000000000005');

-- Fev/2026 — REALISTA
INSERT INTO orcamentos_fechados (clinica_id, mes_referencia, paciente_nome, valor_total, valor_pago, status, data_fechamento, medico_indicador_id) VALUES
('a1000000-0000-0000-0000-000000000002','2026-02-01','Paloma Figueiredo Brant',26000.00,26000.00,'quitado','2026-02-01','b1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Quirino Alves Machado',12400.00,12400.00,'quitado','2026-02-04',NULL),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Renata Sales de Lima',18700.00,10000.00,'parcial','2026-02-07','b1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Sérgio Henrique Dutra',7800.00,7800.00,'quitado','2026-02-10',NULL),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Tatiane Costa Novaes',15300.00,0.00,'em_aberto','2026-02-13','b1000000-0000-0000-0000-000000000005'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Ubirajara Pinto Soares',4900.00,4900.00,'quitado','2026-02-16',NULL);

-- ============================================================
-- 7. ORÇAMENTOS ABERTOS (pipeline por mês)
-- ============================================================

-- Clínica 1
INSERT INTO orcamentos_abertos (clinica_id, mes_referencia, paciente_nome, valor_total, status, data_criacao) VALUES
('a1000000-0000-0000-0000-000000000001','2025-08-01','Roberto Carlos Neto',22000.00,'aberto','2025-08-20'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Simone Tavares',15000.00,'aberto','2025-08-25'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Tereza Cristina Melo',30000.00,'aberto','2025-09-15'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Ulisses Rocha Dias',18000.00,'aberto','2025-09-20'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Vera Lúcia Campos',12000.00,'aberto','2025-09-25'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Xavier Pinto Marques',8000.00,'aberto','2025-10-18'),
('a1000000-0000-0000-0000-000000000001','2025-11-01','Yara Souza Medeiros',5000.00,'aberto','2025-11-20'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Adriano Ramos Luz',16000.00,'aberto','2026-01-22'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Bianca Fonseca Reis',9000.00,'aberto','2026-01-25'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Cláudio Mendes Brito',20000.00,'aberto','2026-02-18'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Débora Lima Santana',14000.00,'aberto','2026-02-22');

-- Clínica 2
INSERT INTO orcamentos_abertos (clinica_id, mes_referencia, paciente_nome, valor_total, status, data_criacao) VALUES
('a1000000-0000-0000-0000-000000000002','2025-08-01','Edmundo Teixeira Rios',19000.00,'aberto','2025-08-22'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Flávia Cardoso Neves',25000.00,'aberto','2025-09-18'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Geraldo Bastos Cunha',11000.00,'aberto','2025-09-22'),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Heloisa Miranda Costa',14000.00,'aberto','2025-10-20'),
('a1000000-0000-0000-0000-000000000002','2025-11-01','Ícaro Fernandes Luz',6000.00,'aberto','2025-11-18'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Jéssica Almeida Rocha',17000.00,'aberto','2026-01-20'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Leandro Couto Vasconcelos',21000.00,'aberto','2026-02-15'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Mônica Barros Freitas',8500.00,'aberto','2026-02-20');

-- ============================================================
-- 8. TRATAMENTOS EXECUTADOS
-- ============================================================

-- Gerar tratamentos por mês para ambas clínicas
-- Usando procedimentos cadastrados

-- Clínica 1 — todos os meses
INSERT INTO tratamentos_executados (clinica_id, mes_referencia, paciente_nome, procedimento_id, procedimento_nome, quantidade, data_execucao) VALUES
-- Ago/2025
('a1000000-0000-0000-0000-000000000001','2025-08-01','Ana Carolina Ferreira','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',10,'2025-08-03'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Bruno Henrique Costa','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',1,'2025-08-05'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Carla Mendonça Silva','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',8,'2025-08-07'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Diego Ramalho Santos','c1000000-0000-0000-0000-000000000004','Implante Dentário',2,'2025-08-10'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Eliane Gomes Pereira','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',6,'2025-08-12'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Fernando Augusto Lima','c1000000-0000-0000-0000-000000000007','Tratamento de Canal',2,'2025-08-15'),
('a1000000-0000-0000-0000-000000000001','2025-08-01','Gabriela Ramos Diniz','c1000000-0000-0000-0000-000000000009','Limpeza e Profilaxia',1,'2025-08-18'),
-- Set/2025
('a1000000-0000-0000-0000-000000000001','2025-09-01','Helena Cristina Duarte','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',16,'2025-09-02'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Igor Nogueira Braga','c1000000-0000-0000-0000-000000000004','Implante Dentário',4,'2025-09-04'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Juliana Macedo Teixeira','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',6,'2025-09-06'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Kevin Martins de Souza','c1000000-0000-0000-0000-000000000005','Prótese sobre Implante',3,'2025-09-09'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Larissa Fernanda Rocha','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',10,'2025-09-11'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Marcelo Vieira Pinto','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',2,'2025-09-14'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Natália de Almeida Cruz','c1000000-0000-0000-0000-000000000008','Restauração Resina Composta',4,'2025-09-17'),
('a1000000-0000-0000-0000-000000000001','2025-09-01','Otávio Campos Leal','c1000000-0000-0000-0000-000000000006','Extração de Siso',2,'2025-09-20'),
-- Out/2025
('a1000000-0000-0000-0000-000000000001','2025-10-01','Patrícia de Oliveira Lopes','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',6,'2025-10-02'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Rafael Antunes Barros','c1000000-0000-0000-0000-000000000004','Implante Dentário',2,'2025-10-05'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Sandra Maia Correia','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',1,'2025-10-08'),
('a1000000-0000-0000-0000-000000000001','2025-10-01','Úrsula Batista Neves','c1000000-0000-0000-0000-000000000010','Coroa de Porcelana',4,'2025-10-15'),
-- Nov/2025
('a1000000-0000-0000-0000-000000000001','2025-11-01','Vanessa Cardoso Prado','c1000000-0000-0000-0000-000000000007','Tratamento de Canal',3,'2025-11-03'),
('a1000000-0000-0000-0000-000000000001','2025-11-01','William Soares Machado','c1000000-0000-0000-0000-000000000009','Limpeza e Profilaxia',2,'2025-11-06'),
-- Dez/2025
('a1000000-0000-0000-0000-000000000001','2025-12-01','Yasmin Freitas Cavalcanti','c1000000-0000-0000-0000-000000000008','Restauração Resina Composta',3,'2025-12-04'),
-- Jan/2026
('a1000000-0000-0000-0000-000000000001','2026-01-01','Amanda Cristina Lopes','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',8,'2026-01-03'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Bernardo Henrique Vaz','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',2,'2026-01-06'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Cecília Drummond Faria','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',8,'2026-01-09'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Daniel Moreira Peixoto','c1000000-0000-0000-0000-000000000006','Extração de Siso',1,'2026-01-13'),
('a1000000-0000-0000-0000-000000000001','2026-01-01','Eduarda Sampaio Reis','c1000000-0000-0000-0000-000000000004','Implante Dentário',3,'2026-01-16'),
-- Fev/2026
('a1000000-0000-0000-0000-000000000001','2026-02-01','Giovana Lacerda Bastos','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',7,'2026-02-02'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Hugo Leonardo Amaral','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',6,'2026-02-05'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Isabella Morais Cunha','c1000000-0000-0000-0000-000000000004','Implante Dentário',4,'2026-02-07'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','João Pedro Guimarães','c1000000-0000-0000-0000-000000000009','Limpeza e Profilaxia',1,'2026-02-10'),
('a1000000-0000-0000-0000-000000000001','2026-02-01','Lucas Andrade Fonseca','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',1,'2026-02-16');

-- Clínica 2 — todos os meses
INSERT INTO tratamentos_executados (clinica_id, mes_referencia, paciente_nome, procedimento_id, procedimento_nome, quantidade, data_execucao) VALUES
-- Ago/2025
('a1000000-0000-0000-0000-000000000002','2025-08-01','Mariana Souza Bezerra','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',10,'2025-08-02'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Nelson Dias Carneiro','c1000000-0000-0000-0000-000000000004','Implante Dentário',3,'2025-08-05'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Olívia Reis Magalhães','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',12,'2025-08-08'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Paulo Sérgio Araújo','c1000000-0000-0000-0000-000000000007','Tratamento de Canal',2,'2025-08-11'),
('a1000000-0000-0000-0000-000000000002','2025-08-01','Rodrigo Motta Fontes','c1000000-0000-0000-0000-000000000009','Limpeza e Profilaxia',1,'2025-08-17'),
-- Set/2025
('a1000000-0000-0000-0000-000000000002','2025-09-01','Samara Bittencourt Viana','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',18,'2025-09-01'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Tiago Moreira Lins','c1000000-0000-0000-0000-000000000004','Implante Dentário',3,'2025-09-04'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Valéria Pinheiro Dantas','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',10,'2025-09-07'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Wagner Costa Oliveira','c1000000-0000-0000-0000-000000000005','Prótese sobre Implante',4,'2025-09-10'),
('a1000000-0000-0000-0000-000000000002','2025-09-01','Yago Ferreira Siqueira','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',2,'2025-09-16'),
-- Out/2025
('a1000000-0000-0000-0000-000000000002','2025-10-01','Aline Tavares Campos','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',8,'2025-10-03'),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Breno Carvalho Dias','c1000000-0000-0000-0000-000000000007','Tratamento de Canal',2,'2025-10-06'),
('a1000000-0000-0000-0000-000000000002','2025-10-01','Danilo Souza Medeiros','c1000000-0000-0000-0000-000000000004','Implante Dentário',4,'2025-10-13'),
-- Nov/2025
('a1000000-0000-0000-0000-000000000002','2025-11-01','Estela Vieira Franco','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',5,'2025-11-04'),
('a1000000-0000-0000-0000-000000000002','2025-11-01','Graziela Nunes Pires','c1000000-0000-0000-0000-000000000009','Limpeza e Profilaxia',1,'2025-11-12'),
-- Dez/2025
('a1000000-0000-0000-0000-000000000002','2025-12-01','Henrique Marques Teles','c1000000-0000-0000-0000-000000000008','Restauração Resina Composta',4,'2025-12-05'),
-- Jan/2026
('a1000000-0000-0000-0000-000000000002','2026-01-01','Josué Martins Correia','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',12,'2026-01-02'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Kelly Aparecida Torres','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',2,'2026-01-05'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Leonardo Azevedo Gomes','c1000000-0000-0000-0000-000000000004','Implante Dentário',3,'2026-01-08'),
('a1000000-0000-0000-0000-000000000002','2026-01-01','Melissa Ramos Britto','c1000000-0000-0000-0000-000000000007','Tratamento de Canal',2,'2026-01-12'),
-- Fev/2026
('a1000000-0000-0000-0000-000000000002','2026-02-01','Paloma Figueiredo Brant','c1000000-0000-0000-0000-000000000001','Lente de Contato Dental',14,'2026-02-01'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Quirino Alves Machado','c1000000-0000-0000-0000-000000000003','Clareamento a Laser',2,'2026-02-04'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Renata Sales de Lima','c1000000-0000-0000-0000-000000000002','Faceta de Porcelana',6,'2026-02-07'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Sérgio Henrique Dutra','c1000000-0000-0000-0000-000000000006','Extração de Siso',2,'2026-02-10'),
('a1000000-0000-0000-0000-000000000002','2026-02-01','Tatiane Costa Novaes','c1000000-0000-0000-0000-000000000004','Implante Dentário',3,'2026-02-13');

-- ============================================================
-- 9. RESUMO MENSAL (calculado)
-- ============================================================
-- Usando fórmula: faturamento - custos - taxas = líquido → split 60/40

INSERT INTO resumo_mensal (clinica_id, mes_referencia, faturamento_bruto, total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas, valor_liquido, valor_beauty_smile, valor_clinica, total_recebido_mes, total_a_receber_mes, total_inadimplente, total_recebimentos_futuros, status) VALUES
-- Clínica 1
('a1000000-0000-0000-0000-000000000001','2025-08-01', 93500.00, 5260.00, 3500.00, 3272.50, 5610.00, 3370.00, 72487.50, 43492.50, 28995.00, 49600.00, 12000.00, 22200.00, 8000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2025-09-01', 137400.00, 8860.00, 3500.00, 4809.00, 8244.00, 6185.00, 105802.00, 63481.20, 42320.80, 106700.00, 18000.00, 11000.00, 12000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2025-10-01', 60300.00, 3470.00, 3500.00, 2110.50, 3618.00, 2540.00, 45061.50, 27036.90, 18024.60, 47900.00, 6000.00, 6200.00, 4000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2025-11-01', 27300.00, 930.00, 3500.00, 955.50, 1638.00, 1200.00, 19076.50, 11445.90, 7630.60, 13500.00, 3000.00, 5800.00, 2000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2025-12-01', 11700.00, 360.00, 3500.00, 409.50, 702.00, 0.00, 6728.50, 4037.10, 2691.40, 3000.00, 1500.00, 4500.00, 1000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2026-01-01', 76100.00, 4830.00, 3500.00, 2663.50, 4566.00, 3020.00, 57520.50, 34512.30, 23008.20, 53600.00, 10000.00, 13200.00, 7000.00, 'processado'),
('a1000000-0000-0000-0000-000000000001','2026-02-01', 84900.00, 5380.00, 3500.00, 2971.50, 5094.00, 3510.00, 64444.50, 38666.70, 25777.80, 63800.00, 12000.00, 11600.00, 8000.00, 'processado'),

-- Clínica 2
('a1000000-0000-0000-0000-000000000002','2025-08-01', 92200.00, 5590.00, 4200.00, 3227.00, 5532.00, 3180.00, 70471.00, 42282.60, 28188.40, 52400.00, 14000.00, 11800.00, 9000.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2025-09-01', 125500.00, 8840.00, 4200.00, 4392.50, 7530.00, 5630.00, 94907.50, 56944.50, 37963.00, 113600.00, 16000.00, 6400.00, 10000.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2025-10-01', 59100.00, 3640.00, 4200.00, 2068.50, 3546.00, 2520.00, 43125.50, 25875.30, 17250.20, 29600.00, 8000.00, 24000.00, 5000.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2025-11-01', 27500.00, 1140.00, 4200.00, 962.50, 1650.00, 1450.00, 18097.50, 10858.50, 7239.00, 19300.00, 4000.00, 8200.00, 3000.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2025-12-01', 15000.00, 480.00, 4200.00, 525.00, 900.00, 980.00, 7915.00, 4749.00, 3166.00, 4000.00, 2000.00, 5200.00, 1500.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2026-01-01', 69800.00, 4860.00, 4200.00, 2443.00, 4188.00, 2925.00, 51184.00, 30710.40, 20473.60, 53800.00, 9000.00, 6800.00, 6000.00, 'processado'),
('a1000000-0000-0000-0000-000000000002','2026-02-01', 85100.00, 5530.00, 4200.00, 2978.50, 5106.00, 4170.00, 63115.50, 37869.30, 25246.20, 61100.00, 13000.00, 15300.00, 9000.00, 'processado');

-- ============================================================
-- 10. Atualizar contadores dos upload_batches
-- ============================================================
UPDATE upload_batches ub SET total_registros = (
  SELECT count(*) FROM orcamentos_fechados of WHERE of.clinica_id = ub.clinica_id
    AND of.mes_referencia >= ub.mes_referencia
    AND of.mes_referencia < ub.mes_referencia + INTERVAL '1 month'
) WHERE ub.tipo = 'orcamentos_fechados';

UPDATE upload_batches ub SET total_registros = (
  SELECT count(*) FROM orcamentos_abertos oa WHERE oa.clinica_id = ub.clinica_id
    AND oa.mes_referencia >= ub.mes_referencia
    AND oa.mes_referencia < ub.mes_referencia + INTERVAL '1 month'
) WHERE ub.tipo = 'orcamentos_abertos';

UPDATE upload_batches ub SET total_registros = (
  SELECT count(*) FROM tratamentos_executados te WHERE te.clinica_id = ub.clinica_id
    AND te.mes_referencia >= ub.mes_referencia
    AND te.mes_referencia < ub.mes_referencia + INTERVAL '1 month'
) WHERE ub.tipo = 'tratamentos_executados';

-- ============================================================
-- PRONTO! Resumo dos dados inseridos:
-- • 2 clínicas ativas
-- • 5 médicos indicadores (2+3)
-- • 10 procedimentos com custos
-- • 7 meses de dados (Ago/2025 a Fev/2026)
-- • ~80 orçamentos fechados (nomes únicos)
-- • ~19 orçamentos abertos (pipeline)
-- • ~50 tratamentos executados
-- • 14 resumos mensais (7 meses × 2 clínicas)
-- • 42 upload batches (status: concluído)
--
-- Padrão mensal:
--   Ago/2025: BOM        (~R$186k)
--   Set/2025: MUITO BOM  (~R$263k)
--   Out/2025: MÉDIO      (~R$119k)
--   Nov/2025: RUIM       (~R$55k)
--   Dez/2025: MUITO RUIM (~R$27k)
--   Jan/2026: REALISTA   (~R$146k)
--   Fev/2026: REALISTA   (~R$170k)
-- ============================================================
