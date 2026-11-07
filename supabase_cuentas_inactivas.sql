-- Ejecutar una vez desde Supabase SQL Editor.
-- Desactiva las cuentas existentes y establece FALSE como valor por defecto.

BEGIN;

ALTER TABLE public.cuentas
    ALTER COLUMN activa SET DEFAULT FALSE;

UPDATE public.cuentas
SET activa = FALSE
WHERE activa IS DISTINCT FROM FALSE;

COMMIT;

-- Verificación: cuentas_activas debe devolver 0.
SELECT COUNT(*) AS cuentas_activas
FROM public.cuentas
WHERE activa = TRUE;
