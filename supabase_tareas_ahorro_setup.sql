BEGIN;

ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS es_ahorro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cuenta_ahorro_id BIGINT;

ALTER TABLE public.tareas_x_turno
  ADD COLUMN IF NOT EXISTS es_ahorro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cuenta_ahorro_id BIGINT;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tarea_x_turno_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tareas_cuenta_ahorro'
      AND conrelid = 'public.tareas'::regclass
  ) THEN
    ALTER TABLE public.tareas
      ADD CONSTRAINT fk_tareas_cuenta_ahorro
      FOREIGN KEY (cuenta_ahorro_id)
      REFERENCES public.cuentas(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tareas_x_turno_cuenta_ahorro'
      AND conrelid = 'public.tareas_x_turno'::regclass
  ) THEN
    ALTER TABLE public.tareas_x_turno
      ADD CONSTRAINT fk_tareas_x_turno_cuenta_ahorro
      FOREIGN KEY (cuenta_ahorro_id)
      REFERENCES public.cuentas(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tareas_ahorro_cuenta'
      AND conrelid = 'public.tareas'::regclass
  ) THEN
    ALTER TABLE public.tareas
      ADD CONSTRAINT chk_tareas_ahorro_cuenta
      CHECK (NOT es_ahorro OR cuenta_ahorro_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tareas_x_turno_ahorro_cuenta'
      AND conrelid = 'public.tareas_x_turno'::regclass
  ) THEN
    ALTER TABLE public.tareas_x_turno
      ADD CONSTRAINT chk_tareas_x_turno_ahorro_cuenta
      CHECK (NOT es_ahorro OR cuenta_ahorro_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_movimientos_tarea_x_turno'
      AND conrelid = 'public.movimientos'::regclass
  ) THEN
    ALTER TABLE public.movimientos
      ADD CONSTRAINT fk_movimientos_tarea_x_turno
      FOREIGN KEY (tarea_x_turno_id)
      REFERENCES public.tareas_x_turno(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_movimientos_tarea_x_turno
  ON public.movimientos(tarea_x_turno_id)
  WHERE tarea_x_turno_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_task_expense ON public.tareas_x_turno;

CREATE OR REPLACE FUNCTION public.sync_task_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  task_expense_type_id BIGINT;
  task_amount NUMERIC(14,2);
  shift_box_id BIGINT;
  destination_box_id BIGINT;
  savings_account_shift_id BIGINT;
BEGIN
  IF NOT NEW.completada OR NEW.ignorada OR NEW.eliminada THEN
    DELETE FROM public.gastos
    WHERE tarea_x_turno_id = NEW.id;
    DELETE FROM public.movimientos
    WHERE tarea_x_turno_id = NEW.id;
    RETURN NEW;
  END IF;

  task_amount := COALESCE(NEW.monto, NEW.monto_a_transferir);
  IF task_amount IS NULL THEN
    DELETE FROM public.gastos
    WHERE tarea_x_turno_id = NEW.id;
    DELETE FROM public.movimientos
    WHERE tarea_x_turno_id = NEW.id;
    RETURN NEW;
  END IF;

  IF task_amount < 0 THEN
    RAISE EXCEPTION 'El monto de una tarea no puede ser negativo';
  END IF;

  IF NEW.es_ahorro THEN
    DELETE FROM public.gastos
    WHERE tarea_x_turno_id = NEW.id;

    IF task_amount <= 0 THEN
      DELETE FROM public.movimientos
      WHERE tarea_x_turno_id = NEW.id;
      RETURN NEW;
    END IF;

    SELECT caja_id
    INTO shift_box_id
    FROM public.turnos
    WHERE id = NEW.turno_id;

    IF shift_box_id IS NULL THEN
      RAISE EXCEPTION 'No se pudo identificar la caja del turno de la tarea';
    END IF;

    SELECT cuentas_x_turno.id
    INTO savings_account_shift_id
    FROM public.cuentas_x_turno
    JOIN public.cuentas ON cuentas.id = cuentas_x_turno.cuenta_id
    JOIN public.tipos_cuenta ON tipos_cuenta.id = cuentas.tipo_cuenta_id
    WHERE cuentas_x_turno.turno_id = NEW.turno_id
      AND cuentas.id = NEW.cuenta_ahorro_id
      AND tipos_cuenta.ahorro
      AND NOT tipos_cuenta.is_off
      AND (cuentas_x_turno.caja_id = shift_box_id OR cuentas_x_turno.caja_id IS NULL)
    ORDER BY
      CASE WHEN cuentas_x_turno.caja_id = shift_box_id THEN 0 ELSE 1 END,
      cuentas_x_turno.id
    LIMIT 1;

    IF savings_account_shift_id IS NULL THEN
      RAISE EXCEPTION 'La cuenta de ahorro seleccionada no está disponible en este turno';
    END IF;

    SELECT id
    INTO destination_box_id
    FROM public.cajas
    WHERE id <> shift_box_id
    ORDER BY id
    LIMIT 1;

    IF destination_box_id IS NULL THEN
      RAISE EXCEPTION 'Se necesita otra caja para registrar el movimiento de ahorro';
    END IF;

    INSERT INTO public.movimientos (
      turno_id,
      caja_desde_id,
      caja_hasta_id,
      turno_destino_id,
      monto,
      es_ahorro,
      cuenta_x_turno_id,
      notas,
      tarea_x_turno_id
    )
    VALUES (
      NEW.turno_id,
      shift_box_id,
      destination_box_id,
      NULL,
      task_amount,
      TRUE,
      savings_account_shift_id,
      NEW.titulo,
      NEW.id
    )
    ON CONFLICT (tarea_x_turno_id)
      WHERE tarea_x_turno_id IS NOT NULL
    DO UPDATE SET
      turno_id = EXCLUDED.turno_id,
      caja_desde_id = EXCLUDED.caja_desde_id,
      caja_hasta_id = EXCLUDED.caja_hasta_id,
      turno_destino_id = EXCLUDED.turno_destino_id,
      monto = EXCLUDED.monto,
      es_ahorro = EXCLUDED.es_ahorro,
      cuenta_x_turno_id = EXCLUDED.cuenta_x_turno_id,
      notas = EXCLUDED.notas;

    RETURN NEW;
  END IF;

  DELETE FROM public.movimientos
  WHERE tarea_x_turno_id = NEW.id;

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

CREATE TRIGGER trg_sync_task_expense
AFTER INSERT OR UPDATE OF
  completada,
  ignorada,
  eliminada,
  monto,
  monto_a_transferir,
  titulo,
  turno_id,
  es_ahorro,
  cuenta_ahorro_id
ON public.tareas_x_turno
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_expense();

COMMIT;
