-- ── URGENT follow-up to 028 ────────────────────────────────────
-- handle_new_user() still inserted into companion_profiles /
-- client_profiles, which 028 turned into views — Postgres rejects
-- INSERT ... ON CONFLICT on auto-updatable views, so ALL signups fail
-- until this is applied. One-account model version:
--   every signup → profiles row (tier columns have defaults there now);
--   companion-role signups → host_profiles row (real table).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      user_role;
  v_full_name text;
BEGIN
  v_role      := coalesce((new.raw_user_meta_data->>'role')::user_role, 'client');
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, v_full_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'companion' THEN
    INSERT INTO public.host_profiles (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
