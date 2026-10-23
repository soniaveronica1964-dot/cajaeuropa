BEGIN;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS turno_destino_id BIGINT
  REFERENCES public.turnos(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_movimientos_turno_destino
  ON public.movimientos(turno_destino_id);

ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_read_movimientos ON public.movimientos;
CREATE POLICY dev_read_movimientos
  ON public.movimientos
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS dev_insert_movimientos ON public.movimientos;
CREATE POLICY dev_insert_movimientos
  ON public.movimientos
  FOR INSERT TO anon
  WITH CHECK (
    monto > 0
    AND caja_desde_id <> caja_hasta_id
    AND EXISTS (
      SELECT 1
      FROM public.turnos AS origin_shift
      JOIN public.cuentas_x_turno AS account_links
        ON account_links.turno_id = origin_shift.id
      WHERE origin_shift.id = movimientos.turno_id
        AND origin_shift.abierto IS TRUE
        AND account_links.id = movimientos.cuenta_x_turno_id
        AND (
          (
            movimientos.es_ahorro IS FALSE
            AND movimientos.turno_destino_id IS NOT NULL
            AND movimientos.caja_desde_id = origin_shift.caja_id
            AND EXISTS (
              SELECT 1
              FROM public.turnos AS destination_shift
              WHERE destination_shift.id = movimientos.turno_destino_id
                AND destination_shift.abierto IS TRUE
                AND destination_shift.id <> origin_shift.id
                AND destination_shift.caja_id = movimientos.caja_hasta_id
            )
          )
          OR (
            movimientos.es_ahorro IS TRUE
            AND movimientos.turno_destino_id IS NULL
            AND (
              movimientos.caja_desde_id = origin_shift.caja_id
              OR movimientos.caja_hasta_id = origin_shift.caja_id
            )
          )
        )
    )
  );

GRANT SELECT, INSERT ON public.movimientos TO anon;
GRANT SELECT ON public.turnos, public.cuentas_x_turno TO anon;

COMMIT;
