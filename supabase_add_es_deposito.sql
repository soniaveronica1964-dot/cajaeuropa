-- Migración para agregar el check "Depósito" a tipos_cuenta.
-- Ejecutar en Supabase SQL Editor sobre una base que ya contiene tipos_cuenta.

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS es_deposito BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_billetera
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;