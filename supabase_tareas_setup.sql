BEGIN;

CREATE TABLE IF NOT EXISTS public.tareas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caja_id BIGINT NOT NULL REFERENCES public.cajas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_titulo_activo_por_caja
  ON public.tareas(caja_id, lower(btrim(titulo))) WHERE activa;

CREATE TABLE IF NOT EXISTS public.tareas_x_turno (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id BIGINT NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  tarea_id BIGINT NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL CHECK (length(btrim(titulo)) > 0),
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  ignorada BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada BOOLEAN NOT NULL DEFAULT FALSE,
  monto NUMERIC(14,2),
  notas TEXT,
  UNIQUE (turno_id, tarea_id),
  CHECK (NOT (completada AND ignorada))
);

CREATE INDEX IF NOT EXISTS idx_tareas_x_turno_turno
  ON public.tareas_x_turno(turno_id, id);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_x_turno ENABLE ROW LEVEL SECURITY;

COMMIT;
