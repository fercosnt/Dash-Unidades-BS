-- ============================================================
-- 1) DELETAR o usuário parceiro cobaia (para reinserir com nova senha)
-- 2) INSERIR de novo com senha: Parceiro123
--
-- Login: parceiro.cobaia@beautysmile.com.br
-- Senha: Parceiro123
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- PARTE 1: DELETAR ----------
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'parceiro.cobaia@beautysmile.com.br';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE 'Usuário removido: %', v_user_id;
  ELSE
    RAISE NOTICE 'Nenhum usuário com esse e-mail para remover.';
  END IF;
END $$;

-- ---------- PARTE 2: INSERIR COM SENHA Parceiro123 ----------
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_clinica_id UUID;
  v_encrypted_pw TEXT := crypt('Parceiro123', gen_salt('bf'));
  v_email TEXT := 'parceiro.cobaia@beautysmile.com.br';
BEGIN
  SELECT id INTO v_clinica_id
  FROM public.clinicas_parceiras
  WHERE ativo = true
  ORDER BY nome
  LIMIT 1;

  IF v_clinica_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma clínica ativa encontrada. Crie uma clínica em clinicas_parceiras antes de rodar este script.';
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name": "Parceiro Cobaia"}'::jsonb,
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    format('{"sub": "%s", "email": "%s"}', v_user_id, v_email)::jsonb,
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  INSERT INTO public.profiles (id, email, nome, role, clinica_id, ativo)
  VALUES (v_user_id, v_email, 'Parceiro Cobaia', 'parceiro', v_clinica_id, true);

  RAISE NOTICE 'Usuário parceiro criado: % (clínica_id: %)', v_user_id, v_clinica_id;
END $$;
