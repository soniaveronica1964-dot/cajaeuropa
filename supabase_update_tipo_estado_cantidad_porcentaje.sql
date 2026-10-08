-- cantidad_porcentaje representa la cantidad de porcentajes distintos
-- que admite un bono de este tipo; no es un porcentaje en sí mismo.
BEGIN;

ALTER TABLE public.tipos_estado
    DROP CONSTRAINT IF EXISTS tipos_estado_cantidad_porcentaje_check;

ALTER TABLE public.tipos_estado
    ALTER COLUMN cantidad_porcentaje TYPE INTEGER
        USING GREATEST(0, ROUND(COALESCE(cantidad_porcentaje, 1)))::INTEGER,
    ALTER COLUMN cantidad_porcentaje SET DEFAULT 1,
    ALTER COLUMN cantidad_porcentaje SET NOT NULL;

ALTER TABLE public.tipos_estado
    ADD CONSTRAINT chk_tipos_estado_cantidad_porcentaje
    CHECK (cantidad_porcentaje >= 0);

COMMIT;
