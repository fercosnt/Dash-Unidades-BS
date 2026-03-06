-- ============================================================
-- Parceiro cobaia: ATUALIZAR PERFIL (não cria usuário)
-- Use isto DEPOIS de criar o usuário pelo Dashboard do Supabase.
--
-- 1) No Supabase: Authentication > Users > "Add user" >
--    Email: parceiro.cobaia@beautysmile.com.br
--    Password: Parceiro123
--    (desmarque "Auto Confirm User" se quiser; para login direto, deixe confirmado)
--
-- 2) Copie o UUID do usuário criado (coluna Id na lista de users).
--
-- 3) Substitua abaixo o 'SEU_USER_ID_AQUI' pelo UUID e execute este SQL.
-- ============================================================

DO $$
DECLARE
  v_user_id UUID := 'SEU_USER_ID_AQUI'::uuid;
  v_clinica_id UUID;
  v_email TEXT := 'parceiro.cobaia@beautysmile.com.br';
BEGIN
  SELECT id INTO v_clinica_id
  FROM public.clinicas_parceiras
  WHERE ativo = true
  ORDER BY nome
  LIMIT 1;

  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma clínica ativa. Crie uma em clinicas_parceiras antes.';
  END IF;

  INSERT INTO public.profiles (id, email, nome, role, clinica_id, ativo)
  VALUES (v_user_id, v_email, 'Parceiro Cobaia', 'parceiro', v_clinica_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    role = EXCLUDED.role,
    clinica_id = EXCLUDED.clinica_id,
    ativo = EXCLUDED.ativo;

  RAISE NOTICE 'Perfil parceiro configurado para user_id: %, clinica_id: %', v_user_id, v_clinica_id;
END $$;
