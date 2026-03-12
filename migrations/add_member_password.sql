-- Migration : ajout du mot de passe par membre
-- À appliquer via : npx drizzle-kit push
-- Ou manuellement sur votre base Neon/Postgres :

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS password_hash text;
