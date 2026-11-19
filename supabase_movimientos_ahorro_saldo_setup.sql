BEGIN;

CREATE OR REPLACE FUNCTION public.sync_savings_movement_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  shift_box_id BIGINT;
  balance_delta NUMERIC(14,2);
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.es_ahorro THEN
      SELECT caja_id
      INTO shift_box_id
      FROM public.turnos
      WHERE id = OLD.turno_id;

      IF shift_box_id IS NOT NULL THEN
        IF OLD.caja_desde_id = shift_box_id THEN
          balance_delta := OLD.monto;
        ELSIF OLD.caja_hasta_id = shift_box_id THEN
          balance_delta := -OLD.monto;
        ELSE
          RAISE EXCEPTION 'El movimiento de ahorro no está conectado a la caja de su turno';
        END IF;

        UPDATE public.cuentas_x_turno
        SET valor = valor - balance_delta
        WHERE id = OLD.cuenta_x_turno_id
          AND turno_id = OLD.turno_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.es_ahorro THEN
    SELECT caja_id
    INTO shift_box_id
    FROM public.turnos
    WHERE id = NEW.turno_id;

    IF shift_box_id IS NULL THEN
      RAISE EXCEPTION 'No se pudo identificar la caja del turno del movimiento de ahorro';
    END IF;

    IF NEW.caja_desde_id = shift_box_id THEN
      balance_delta := NEW.monto;
    ELSIF NEW.caja_hasta_id = shift_box_id THEN
      balance_delta := -NEW.monto;
    ELSE
      RAISE EXCEPTION 'El movimiento de ahorro debe incluir la caja de su turno';
    END IF;

    UPDATE public.cuentas_x_turno
    SET valor = valor + balance_delta
    WHERE id = NEW.cuenta_x_turno_id
      AND turno_id = NEW.turno_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró la billetera del movimiento en el turno';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_savings_movement_account_balance ON public.movimientos;

CREATE TRIGGER trg_sync_savings_movement_account_balance
AFTER INSERT OR DELETE OR UPDATE OF
  turno_id,
  caja_desde_id,
  caja_hasta_id,
  monto,
  es_ahorro,
  cuenta_x_turno_id
ON public.movimientos
FOR EACH ROW
EXECUTE FUNCTION public.sync_savings_movement_account_balance();

COMMIT;
