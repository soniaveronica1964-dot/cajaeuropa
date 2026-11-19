BEGIN;

ALTER TABLE public.tareas_x_turno
  ALTER COLUMN tarea_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS origen_tarea_x_turno_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tareas_x_turno_origen_tarea_x_turno_id_fkey'
      AND conrelid = 'public.tareas_x_turno'::regclass
  ) THEN
    ALTER TABLE public.tareas_x_turno
      ADD CONSTRAINT tareas_x_turno_origen_tarea_x_turno_id_fkey
      FOREIGN KEY (origen_tarea_x_turno_id)
      REFERENCES public.tareas_x_turno(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tareas_x_turno_turno_id_origen_tarea_x_turno_id_key'
      AND conrelid = 'public.tareas_x_turno'::regclass
  ) THEN
    ALTER TABLE public.tareas_x_turno
      ADD CONSTRAINT tareas_x_turno_turno_id_origen_tarea_x_turno_id_key
      UNIQUE (turno_id, origen_tarea_x_turno_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tareas_x_turno_tarea_origen'
      AND conrelid = 'public.tareas_x_turno'::regclass
  ) THEN
    ALTER TABLE public.tareas_x_turno
      ADD CONSTRAINT chk_tareas_x_turno_tarea_origen
      CHECK (
        (tarea_id IS NOT NULL AND origen_tarea_x_turno_id IS NULL)
        OR (tarea_id IS NULL AND origen_tarea_x_turno_id IS NOT NULL)
      );
  END IF;
END $$;

COMMIT;
