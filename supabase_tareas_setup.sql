BEGIN;

CREATE TABLE IF NOT EXISTS public.tareas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caja_id BIGINT NOT NULL REFERENCES public.cajas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  alias TEXT,
  titular TEXT,
  monto_a_transferir NUMERIC(14,2),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS titular TEXT,
  ADD COLUMN IF NOT EXISTS monto_a_transferir NUMERIC(14,2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_titulo_activo_por_caja
  ON public.tareas(caja_id, lower(btrim(titulo))) WHERE activa;

CREATE TABLE IF NOT EXISTS public.tareas_x_turno (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id BIGINT NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  tarea_id BIGINT NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  alias TEXT,
  titular TEXT,
  monto_a_transferir NUMERIC(14,2),
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  ignorada BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada BOOLEAN NOT NULL DEFAULT FALSE,
  monto NUMERIC(14,2),
  notas TEXT,
  UNIQUE (turno_id, tarea_id),
  CHECK (NOT (completada AND ignorada))
);

DO $$
DECLARE
  has_task_details_snapshot BOOLEAN;
BEGIN
  SELECT COUNT(*) = 3
  INTO has_task_details_snapshot
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tareas_x_turno'
    AND column_name IN ('alias', 'titular', 'monto_a_transferir');

  IF NOT has_task_details_snapshot THEN
    ALTER TABLE public.tareas_x_turno
      ADD COLUMN IF NOT EXISTS alias TEXT,
      ADD COLUMN IF NOT EXISTS titular TEXT,
      ADD COLUMN IF NOT EXISTS monto_a_transferir NUMERIC(14,2);

    UPDATE public.tareas_x_turno AS task_lines
    SET alias = task_definitions.alias,
        titular = task_definitions.titular,
        monto_a_transferir = task_definitions.monto_a_transferir
    FROM public.tareas AS task_definitions
    WHERE task_definitions.id = task_lines.tarea_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tareas_x_turno_turno
  ON public.tareas_x_turno(turno_id, id);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_x_turno ENABLE ROW LEVEL SECURITY;

COMMIT;
