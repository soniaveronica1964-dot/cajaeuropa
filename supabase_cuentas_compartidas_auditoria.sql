ALTER TABLE cuentas_x_turno
    ALTER COLUMN caja_id DROP NOT NULL;

ALTER TABLE cuentas_x_turno
    ADD COLUMN IF NOT EXISTS valor_actualizado_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS caja_id_actualizado_en TIMESTAMPTZ;

UPDATE cuentas_x_turno
SET valor_actualizado_en = NOW()
WHERE valor <> 0
  AND valor_actualizado_en IS NULL;
