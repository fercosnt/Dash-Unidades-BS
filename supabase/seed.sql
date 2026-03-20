-- ============================================================
-- Seed: Admin user (Beauty Smile)
--
-- Execute no Supabase SQL Editor DEPOIS de criar o usuário
-- pelo Supabase Dashboard (Authentication > Users > Add user).
--
-- 1) Crie o usuário no Supabase Dashboard:
--    Email: fernandinho.costa.neto@gmail.com
--    Password: (sua senha)
--    Marque "Auto Confirm User"
--
-- 2) Copie o UUID do usuário criado.
--
-- 3) Substitua 'SEU_USER_ID_AQUI' pelo UUID e execute este SQL.
-- ============================================================

DO $$
DECLARE
  v_user_id UUID := 'SEU_USER_ID_AQUI'::uuid;
  v_email TEXT := 'fernandinho.costa.neto@gmail.com';
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, clinica_id, ativo)
  VALUES (v_user_id, v_email, 'Fernando Costa', 'admin', NULL, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    role = EXCLUDED.role,
    clinica_id = EXCLUDED.clinica_id,
    ativo = EXCLUDED.ativo;

  RAISE NOTICE 'Perfil admin configurado para user_id: %', v_user_id;
END $$;
