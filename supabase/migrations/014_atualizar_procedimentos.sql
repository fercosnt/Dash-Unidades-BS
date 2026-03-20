-- Migration 014: Atualizar tabela de procedimentos
-- Atualiza existentes (match por codigo_clinicorp) e insere novos. Todos ficam ativos.

WITH novos(nome, codigo_clinicorp, custo_fixo, categoria, valor_tabela) AS (
  VALUES
    ('Alinhador Fotona', 'Alinhador invisivel Beauty Smile e Fotobiomodulação Laser Fotona', 5750.00, 'Alinhador', 18000.00),
    ('Clareamento (4 sessões)', 'Clareamento dental com Laser Fotona (4 Sessões)', 190.00, 'Clareamento', 7500.00),
    ('Clareamento Dental (Manutenção)', 'Clareamento dental com Laser Fotona (Manutenção)', 190.00, 'Clareamento', 2000.00),
    ('Clareamento Dental (Sessão Extra)', 'Clareamento dental com Laser Fotona (Sessão Extra)', 190.00, 'Clareamento', 1000.00),
    ('Clareamento (1 sessão)', 'Clareamento dental com Laser Fotona (Sessão Única)', 190.00, 'Clareamento', 2500.00),
    ('Consulta', 'Consulta e avaliação', 0.00, 'Consulta', 0.00),
    ('Contenção Alinhador', 'Contenção pós Alinhador e Fotobiomodulação Laser Fotona', 1000.00, 'Alinhador', 3000.00),
    ('Desinfecção Periodontal', 'Desinfecção Periodontal Protocolo com Laser Fotona', 300.00, 'Limpeza a Laser', 10500.00),
    ('Limpeza a Laser (Manutenção)', 'Limpeza Dental com Laser Fotona (Manutenção)', 300.00, 'Limpeza a Laser', 2000.00),
    ('Limpeza a Laser (1 sessão)', 'Limpeza Dental com Laser Fotona (Sessão Única)', 300.00, 'Limpeza a Laser', 3000.00),
    ('Beauty Sleep - Apneia (1 sessão)', 'Protocolo para diminuição da Apneia (1 sessão)', 380.00, 'Beauty Sleep', 4950.00),
    ('Beauty Sleep - Apneia (4 Sessões)', 'Protocolo para diminuição da Apneia (4 sessões)', 380.00, 'Beauty Sleep', 15000.00),
    ('Beauty Sleep - Apneia (6 Sessões)', 'Protocolo para diminuição da Apneia (6 sessões)', 380.00, 'Beauty Sleep', 17000.00),
    ('Beauty Sleep - Apneia (Anual)', 'Protocolo para diminuição da Apneia (Anual)', 380.00, 'Beauty Sleep', 35000.00),
    ('Beauty Sleep - Apneia (Pacote Extra)', 'Protocolo para diminuição da Apneia (Pacote Extra)', 380.00, 'Beauty Sleep', 8800.00),
    ('Beauty Sleep - Apneia (Sessão Extra)', 'Protocolo para diminuição da Apneia (Sessão Extra)', 380.00, 'Beauty Sleep', 2750.00),
    ('Beauty Sleep - Ronco (1 sessão)', 'Protocolo para diminuição do Ronco (1 sessão)', 230.00, 'Beauty Sleep', 4050.00),
    ('Beauty Sleep - Ronco (4 Sessões)', 'Protocolo para diminuição do ronco (4 sessões)', 230.00, 'Beauty Sleep', 10800.00),
    ('Beauty Sleep - Ronco (6 Sessões)', 'Protocolo para diminuição do Ronco (6 sessões)', 230.00, 'Beauty Sleep', 15000.00),
    ('Beauty Sleep - Ronco (Anual)', 'Protocolo para diminuição do Ronco (Anual)', 230.00, 'Beauty Sleep', 30000.00),
    ('Beauty Sleep - Ronco (Pacote Extra)', 'Protocolo para diminuição do Ronco (Pacote Extra)', 230.00, 'Beauty Sleep', 7200.00),
    ('Beauty Sleep - Ronco (Sessão Extra)', 'Protocolo para diminuição do Ronco (Sessão Extra)', 230.00, 'Beauty Sleep', 2250.00),
    ('Sensibilidade (Manutenção)', 'Sensibilidade dental manutenção com laser Fotona', 190.00, 'Sensibilidade', 500.00),
    ('Sensibilidade (Elemento)', 'Sensibilidade dental Protocolo com Laser Fotona (elemento)', 190.00, 'Sensibilidade', 1000.00),
    ('Sensibilidade (Extra)', 'Sensibilidade dental Sessao Extra com Laser Fotona', 190.00, 'Sensibilidade', 500.00)
),
-- Atualizar procedimentos que já existem (match por codigo_clinicorp)
atualizado AS (
  UPDATE procedimentos p
  SET
    nome = n.nome,
    custo_fixo = n.custo_fixo,
    categoria = n.categoria,
    valor_tabela = n.valor_tabela,
    ativo = true
  FROM novos n
  WHERE p.codigo_clinicorp = n.codigo_clinicorp
  RETURNING p.codigo_clinicorp
)
-- Inserir os que não existiam
INSERT INTO procedimentos (nome, codigo_clinicorp, custo_fixo, categoria, valor_tabela, ativo)
SELECT n.nome, n.codigo_clinicorp, n.custo_fixo, n.categoria, n.valor_tabela, true
FROM novos n
WHERE n.codigo_clinicorp NOT IN (SELECT codigo_clinicorp FROM atualizado);
