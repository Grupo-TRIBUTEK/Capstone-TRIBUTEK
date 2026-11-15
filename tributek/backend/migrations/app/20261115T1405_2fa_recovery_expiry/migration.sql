-- Additive: recovery codes (hashed, one-time) and pending 2FA setup expiry
ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "two_factor_recovery_hashes" VARCHAR(2000),
  ADD COLUMN IF NOT EXISTS "two_factor_setup_expires_at" TIMESTAMPTZ;
