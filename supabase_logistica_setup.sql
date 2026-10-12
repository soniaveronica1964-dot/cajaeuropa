-- Agrega persistencia para ocultar y restaurar billeteras de logística.
-- Se puede ejecutar más de una vez sin afectar registros existentes.

ALTER TABLE public.lineas_logistica
  ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

-- La app usa anon sin autenticación; limita las altas a cuentas del turno abierto.
ALTER TABLE public.lineas_logistica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_insert_lineas_logistica ON public.lineas_logistica;
CREATE POLICY dev_insert_lineas_logistica ON public.lineas_logistica
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.logistica AS logistics
      JOIN public.turnos AS shifts
        ON shifts.id = logistics.turno_id
      JOIN public.cuentas_x_turno AS account_links
        ON account_links.turno_id = shifts.id
      WHERE logistics.id = lineas_logistica.logistica_id
        AND account_links.id = lineas_logistica.cuenta_x_turno_id
        AND shifts.abierto IS TRUE
    )
  );
