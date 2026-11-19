BEGIN;

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS tarea_x_turno_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_gastos_tarea_x_turno'
      AND conrelid = 'public.gastos'::regclass
  ) THEN
    ALTER TABLE public.gastos
      ADD CONSTRAINT fk_gastos_tarea_x_turno
      FOREIGN KEY (tarea_x_turno_id)
      REFERENCES public.tareas_x_turno(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gastos_tarea_x_turno
  ON public.gastos(tarea_x_turno_id)
  WHERE tarea_x_turno_id IS NOT NULL;

INSERT INTO public.tipos_gasto (nombre, invertir_signo)
SELECT 'Tarea', FALSE
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tipos_gasto
  WHERE lower(btrim(nombre)) = 'tarea'
);

UPDATE public.tipos_gasto
SET invertir_signo = FALSE
WHERE id = (
  SELECT id
  FROM public.tipos_gasto
  WHERE lower(btrim(nombre)) = 'tarea'
  ORDER BY id
  LIMIT 1
);

CREATE OR REPLACE FUNCTION public.sync_task_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  task_expense_type_id BIGINT;
  task_amount NUMERIC(14,2);
BEGIN
  IF NOT NEW.completada OR NEW.ignorada OR NEW.eliminada THEN
    DELETE FROM public.gastos
    WHERE tarea_x_turno_id = NEW.id;
    RETURN NEW;
  END IF;

  task_amount := COALESCE(NEW.monto, NEW.monto_a_transferir);
  IF task_amount IS NULL THEN
    DELETE FROM public.gastos
    WHERE tarea_x_turno_id = NEW.id;
    RETURN NEW;
  END IF;

  IF task_amount < 0 THEN
    RAISE EXCEPTION 'El monto de una tarea no puede ser negativo';
  END IF;

  SELECT id
  INTO task_expense_type_id
  FROM public.tipos_gasto
  WHERE lower(btrim(nombre)) = 'tarea'
  ORDER BY id
  LIMIT 1;

  IF task_expense_type_id IS NULL THEN
    RAISE EXCEPTION 'No existe la categoría de gasto Tarea';
  END IF;

  INSERT INTO public.gastos (
    tipo_gasto_id,
    monto,
    notas,
    turno_id,
    tarea_x_turno_id
  )
  VALUES (
    task_expense_type_id,
    task_amount,
    NEW.titulo,
    NEW.turno_id,
    NEW.id
  )
  ON CONFLICT (tarea_x_turno_id)
    WHERE tarea_x_turno_id IS NOT NULL
  DO UPDATE SET
    tipo_gasto_id = EXCLUDED.tipo_gasto_id,
    monto = EXCLUDED.monto,
    notas = EXCLUDED.notas,
    turno_id = EXCLUDED.turno_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_task_expense ON public.tareas_x_turno;

CREATE TRIGGER trg_sync_task_expense
AFTER INSERT OR UPDATE OF
  completada,
  ignorada,
  eliminada,
  monto,
  monto_a_transferir,
  titulo,
  turno_id
ON public.tareas_x_turno
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_expense();

COMMIT;
