ALTER TABLE "usuarios"
  ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "two_factor_secret" VARCHAR(255),
  ADD COLUMN "two_factor_temp_secret" VARCHAR(255);
