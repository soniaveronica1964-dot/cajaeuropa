-- Agrega persistencia para ocultar y restaurar billeteras de logística.
-- Se puede ejecutar más de una vez sin afectar registros existentes.

ALTER TABLE public.lineas_logistica
  ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;
